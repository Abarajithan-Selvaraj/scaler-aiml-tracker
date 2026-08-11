import { Module, ScheduleBlock, Settings, SyllabusItem } from '../types/tracker';

export interface TrackerMetrics {
  totalHoursNeeded: number;
  totalHoursLogged: number;
  totalHoursRemaining: number;
  carriedForwardDeficitHours: number;
  effectiveHoursRemaining: number;
  completionPercentage: number;
  completedItemsCount: number;
  totalItemsCount: number;
  streakDays: number;
  daysElapsed: number;
  daysRemaining: number;
  rollingWeeklyPace: number;
  projectedFinishDate: string; // ISO format "YYYY-MM-DD"
  finishDeltaDays: number;     // Positive means behind schedule, negative means ahead
  isSleepWarningActive: boolean;
}

export interface ScopeSuggestion {
  id: string;
  title: string;
  description: string;
  estimatedHoursSaved: number;
  category: 'playback' | 'problems' | 'papers' | 'buffer';
}

export const STATIC_SCOPE_SUGGESTIONS: ScopeSuggestion[] = [
  {
    id: 'sugg_1',
    title: 'Increase Video Playback to 1.75x',
    description: 'Watch all recorded class lectures at 1.75x speed instead of 1.0x or 1.25x.',
    estimatedHoursSaved: 35.0,
    category: 'playback'
  },
  {
    id: 'sugg_2',
    title: 'Skip Optional / Additional Problems',
    description: 'Focus strictly on primary mandatory assignments; skip supplementary problem sets.',
    estimatedHoursSaved: 24.0,
    category: 'problems'
  },
  {
    id: 'sugg_3',
    title: 'Single-Pass Paper Summaries',
    description: 'Read research paper abstracts, key diagrams, and conclusions instead of full deep dives.',
    estimatedHoursSaved: 18.0,
    category: 'papers'
  },
  {
    id: 'sugg_4',
    title: 'Utilize 14-Day Buffer Weeks',
    description: 'Schedule dedicated revision catch-up sessions during the 2 pre-allocated buffer weeks.',
    estimatedHoursSaved: 40.0,
    category: 'buffer'
  }
];

export function computeTrackerMetrics(
  modules: Module[],
  syllabusItems: SyllabusItem[],
  scheduleBlocks: ScheduleBlock[],
  settings: Settings,
  currentDateStr: string
): TrackerMetrics {
  const totalItemsCount = syllabusItems.length;
  const completedItemsCount = syllabusItems.filter(i => i.completed).length;
  const completionPercentage = totalItemsCount > 0 ? (completedItemsCount / totalItemsCount) * 100 : 0;

  // Calculate total hours
  const totalHoursNeeded = modules.reduce((sum, m) => sum + (m.estimatedHours?.total || 0), 0);
  const totalHoursLogged = scheduleBlocks.reduce((sum, b) => sum + (b.actualHours || 0), 0);
  const totalHoursRemaining = Math.max(0, totalHoursNeeded - totalHoursLogged);

  // Deficit Rollover & Carry-Forward Calculation (Only uncompleted past blocks generate deficit)
  const pastBlocks = scheduleBlocks.filter(b => b.date <= currentDateStr);
  const carriedForwardDeficitHours = pastBlocks
    .filter(b => !b.completed)
    .reduce((sum, b) => sum + Math.max(0, (b.targetHours || 0) - (b.actualHours || 0)), 0);
  const carriedForwardDeficitHoursRounded = Math.max(0, Math.round(carriedForwardDeficitHours * 100) / 100);
  const effectiveHoursRemaining = Math.round((totalHoursRemaining + carriedForwardDeficitHoursRounded) * 100) / 100;

  // Date math
  const startDate = new Date(settings.courseStartDate);
  const targetFinishDate = new Date(settings.chosenPaceFinish);
  const currentDate = new Date(currentDateStr);

  const daysElapsed = Math.max(0, Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
  const daysRemaining = Math.max(0, Math.floor((targetFinishDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)));

  // Streak computation (consecutive days where actualHours >= targetHours * 0.8)
  const blocksByDate = new Map<string, { actual: number; target: number }>();
  for (const block of scheduleBlocks) {
    const prev = blocksByDate.get(block.date) || { actual: 0, target: 0 };
    blocksByDate.set(block.date, {
      actual: prev.actual + (block.actualHours || 0),
      target: prev.target + (block.targetHours || 0),
    });
  }

  // Iterate backwards from currentDate
  let streakDays = 0;
  const checkDate = new Date(currentDate);
  while (true) {
    const iso = checkDate.toISOString().split('T')[0];
    if (iso < settings.courseStartDate) break;

    const dayData = blocksByDate.get(iso);
    if (!dayData) break;

    const threshold = dayData.target * 0.8;
    if (dayData.actual >= threshold && dayData.actual > 0) {
      streakDays++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // Sleep floor warning check (trailing 5 logged days with sleepHours < sleepFloorHours)
  const loggedSleepDays = scheduleBlocks
    .filter(b => b.block === 'AM' && b.sleepHours !== null && b.sleepHours !== undefined && b.date <= currentDateStr)
    .sort((a, b) => b.date.localeCompare(a.date));

  let isSleepWarningActive = false;
  if (loggedSleepDays.length >= 5) {
    const last5 = loggedSleepDays.slice(0, 5);
    const consecutiveLowSleep = last5.every(b => (b.sleepHours ?? 0) < settings.sleepFloorHours);
    if (consecutiveLowSleep) {
      isSleepWarningActive = true;
    }
  }

  // Rolling 14-day pace (hours per week)
  const windowDays = Math.min(14, Math.max(1, daysElapsed + 1));
  const windowStart = new Date(currentDate);
  windowStart.setDate(windowStart.getDate() - windowDays + 1);
  const windowStartIso = windowStart.toISOString().split('T')[0];

  const loggedInWindow = scheduleBlocks
    .filter(b => b.date >= windowStartIso && b.date <= currentDateStr)
    .reduce((sum, b) => sum + (b.actualHours || 0), 0);

  const defaultWeeklyTarget = 14.0;
  const rollingWeeklyPace = loggedInWindow > 0 ? (loggedInWindow / windowDays) * 7 : defaultWeeklyTarget;

  // Projected finish date incorporating deficit carry-forward
  const dailyPace = Math.max(0.5, rollingWeeklyPace / 7);
  const daysToFinish = Math.ceil(effectiveHoursRemaining / dailyPace);

  const projDate = new Date(currentDate);
  projDate.setDate(projDate.getDate() + daysToFinish);
  const projectedFinishDate = projDate.toISOString().split('T')[0];

  const chosenFinish = new Date(settings.chosenPaceFinish);
  const finishDeltaDays = Math.round((projDate.getTime() - chosenFinish.getTime()) / (1000 * 60 * 60 * 24));

  return {
    totalHoursNeeded,
    totalHoursLogged,
    totalHoursRemaining,
    carriedForwardDeficitHours: carriedForwardDeficitHoursRounded,
    effectiveHoursRemaining,
    completionPercentage,
    completedItemsCount,
    totalItemsCount,
    streakDays,
    daysElapsed,
    daysRemaining,
    rollingWeeklyPace,
    projectedFinishDate,
    finishDeltaDays,
    isSleepWarningActive,
  };
}
