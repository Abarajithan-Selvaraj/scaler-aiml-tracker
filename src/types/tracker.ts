export type DayName = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export interface ModuleEstimatedHours {
  video: number;
  homework: number;
  papers: number;
  skillTest: number;
  mockInterview: number;
  capstone: number;
  total: number;
}

export interface Module {
  id: string;                 // "M4".."M18"
  moduleNumber: number;       // 4..18
  name: string;               // e.g. "MLOps — Productionization of ML Systems"
  weeks: string;              // "4 weeks"
  classesTotal: number;
  papersTotal: number;
  skillTestRequired: boolean;
  mockInterviewRequired: boolean;
  mockInterviewStatus: "Pending" | "Expired" | "Not Required";
  capstoneRequired: boolean;
  estimatedHours: ModuleEstimatedHours;
  cumulativeHours: number;    // running total through this module, in curriculum order
  status: "not_started" | "in_progress" | "completed";
  isDataConfirmed: boolean;   // false only if a module's source page was ever a placeholder
  notes: string;
}

export interface SyllabusItem {
  id: string;                 // "item_0001".."item_0270"
  sequence: number;           // schedule order, 1-based
  moduleId: string;           // FK -> Module.id, or "C1"/"C2" for capstones
  type: "Class" | "Paper" | "Test" | "Mock" | "Capstone";
  title: string;              // real extracted class/paper/test title
  estimatedHours: number;
  completed: boolean;          // USER-WRITABLE

  // Class sub-components (Video, Assignments, Additional Problems)
  hasVideo?: boolean;
  videoCompleted?: boolean;
  hasAssignment?: boolean;
  assignmentCompleted?: boolean;
  hasAdditionalProblems?: boolean;
  additionalProblemsCompleted?: boolean;
}

export interface ScheduleBlock {
  id: string;                 // "block_0001".."block_0404"
  date: string;               // ISO "2026-08-01"
  dayOfWeek: string;
  block: "AM" | "PM";
  timeWindow: string;         // "5:00-6:30 AM"
  targetHours: number;
  isTravelWeekend: boolean;
  isBuffer: boolean;
  focusItems: string[];       // raw display labels from seed
  itemIds?: string[];         // resolved SyllabusItem.id array (FR-2 / 5.5 linking pass)
  actualHours: number | null; // USER-WRITABLE
  sleepHours: number | null;  // USER-WRITABLE, logged once/day on AM block
  notes: string;              // USER-WRITABLE
  completed: boolean;         // USER-WRITABLE
}

export interface SettingsAssumptions {
  recordingLengthHours?: number;
  playbackSpeed?: number;
  homeworkHoursPerRecording?: number;
  paperHours?: number;
  skillTestHours?: number;
  mockInterviewHours?: number;
  capstoneHours?: number;
  [key: string]: any;
}

export interface Settings {
  courseStartDate: string;       // "2026-08-01"
  targetDeadline: string;        // "2026-12-31"
  sustainablePaceFinish: string; // "2027-03-30"
  chosenPaceFinish: string;      // "2027-02-18"
  weeklyTemplate: Record<string, { AM: number; PM: number }>;
  sleepFloorHours: number;       // 6.0
  travelWeekendFrequencyWeeks: number; // 4
  assumptions: SettingsAssumptions;
  simulatedDate?: string;        // For testing different dates within course window
}

export interface SeedData {
  modules: Module[];
  syllabusItems: SyllabusItem[];
  scheduleBlocks: ScheduleBlock[];
  settings: Settings;
}

export interface DataService {
  init(): Promise<void>;
  getModules(): Promise<Module[]>;
  getSyllabusItems(): Promise<SyllabusItem[]>;
  getScheduleBlocks(range?: { from: string; to: string }): Promise<ScheduleBlock[]>;
  getSettings(): Promise<Settings>;
  updateModule(id: string, patch: Partial<Module>): Promise<void>;
  updateSyllabusItem(id: string, patch: Partial<SyllabusItem>): Promise<void>;
  updateScheduleBlock(id: string, patch: Partial<ScheduleBlock>): Promise<void>;
  updateSettings(patch: Partial<Settings>): Promise<void>;
  resetData(): Promise<void>;
}
