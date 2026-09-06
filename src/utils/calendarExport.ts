import { ScheduleBlock, SyllabusItem } from '../types/tracker';

/**
 * Formats an ISO date string (YYYY-MM-DD) and optional time window string (e.g. "5:00-6:30 AM")
 * into Google Calendar ISO 8601 UTC date string format: YYYYMMDDTHHMMSSZ
 */
export function formatBlockCalendarDates(dateIso: string, timeWindow?: string): { startIso: string; endIso: string } {
  const [year, month, day] = dateIso.split('-').map(Number);
  
  let startHour = 7;
  let startMin = 0;
  let endHour = 9;
  let endMin = 30;

  if (timeWindow) {
    // Parse time formats like "5:00-6:30 AM", "6:00-8:30 PM", "7:00-9:30 PM"
    const match = timeWindow.match(/(\d+):?(\d+)?\s*-\s*(\d+):?(\d+)?\s*(AM|PM)?/i);
    if (match) {
      let sh = parseInt(match[1], 10);
      const sm = parseInt(match[2] || '0', 10);
      let eh = parseInt(match[3], 10);
      const em = parseInt(match[4] || '0', 10);
      const period = (match[5] || '').toUpperCase();

      if (period === 'PM' && sh < 12) sh += 12;
      if (period === 'PM' && eh < 12) eh += 12;
      if (period === 'AM' && sh === 12) sh = 0;
      if (period === 'AM' && eh === 12) eh = 0;

      startHour = sh;
      startMin = sm;
      endHour = eh;
      endMin = em;
    }
  }

  const pad = (n: number) => n.toString().padStart(2, '0');
  
  // Format as YYYYMMDDTHHMMSS
  const startStr = `${year}${pad(month)}${pad(day)}T${pad(startHour)}${pad(startMin)}00`;
  const endStr = `${year}${pad(month)}${pad(day)}T${pad(endHour)}${pad(endMin)}00`;

  return { startIso: startStr, endIso: endStr };
}

/**
 * Builds a 1-click Google Calendar Web template URL for a given ScheduleBlock
 */
export function buildGoogleCalendarWebUrl(block: ScheduleBlock, syllabusItems: SyllabusItem[]): string {
  const matchingItems = (block.itemIds || [])
    .map((id) => syllabusItems.find((item) => item.id === id))
    .filter((item): item is SyllabusItem => Boolean(item));

  const titles = matchingItems.map((i) => i.title).join(', ') || block.focusItems.join(', ') || 'Study Session';
  const eventTitle = `[Scaler Backlog] ${titles}`;

  const { startIso, endIso } = formatBlockCalendarDates(block.date, block.timeWindow);

  const description = [
    `Scaler AI/ML Backlog Study Session`,
    `Block: ${block.block} (${block.timeWindow})`,
    `Target Hours: ${block.targetHours}h`,
    matchingItems.length > 0 ? `Focus Items: ${matchingItems.map((i) => i.title).join('\n - ')}` : '',
    `Logged in Scaler Certification Tracker`,
  ]
    .filter(Boolean)
    .join('\n\n');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: eventTitle,
    dates: `${startIso}/${endIso}`,
    details: description,
    location: 'Scaler AI/ML Learning Platform',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generates valid iCalendar (.ics) format string containing all uncompleted backlog blocks
 */
export function generateBacklogIcsContent(blocks: ScheduleBlock[], syllabusItems: SyllabusItem[]): string {
  const incompleteBlocks = blocks.filter((b) => !b.completed);
  
  const icsLines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Scaler AI/ML Tracker//Backlog Sync//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Scaler AI/ML Backlogs',
    'X-WR-TIMEZONE:UTC',
  ];

  for (const block of incompleteBlocks) {
    const { startIso, endIso } = formatBlockCalendarDates(block.date, block.timeWindow);
    const matchingItems = (block.itemIds || [])
      .map((id) => syllabusItems.find((item) => item.id === id))
      .filter((item): item is SyllabusItem => Boolean(item));

    const titles = matchingItems.map((i) => i.title).join(', ') || block.focusItems.join(', ') || 'Study Session';
    const summary = `[Scaler Backlog] ${titles.replace(/,/g, '\\,')}`;
    const description = `Backlog Study Session (${block.block} - ${block.timeWindow}). Target: ${block.targetHours}h.`;

    icsLines.push(
      'BEGIN:VEVENT',
      `UID:scaler-backlog-${block.id}@tracker`,
      `DTSTAMP:${startIso}Z`,
      `DTSTART:${startIso}`,
      `DTEND:${endIso}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      'LOCATION:Scaler AI/ML Platform',
      'STATUS:CONFIRMED',
      'END:VEVENT'
    );
  }

  icsLines.push('END:VCALENDAR');
  return icsLines.join('\r\n');
}

/**
 * Triggers a client-side browser download of the backlog .ics calendar file
 */
export function downloadBacklogIcsFile(blocks: ScheduleBlock[], syllabusItems: SyllabusItem[]): void {
  const icsContent = generateBacklogIcsContent(blocks, syllabusItems);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'scaler-backlogs.ics');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
