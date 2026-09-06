import { describe, it, expect } from 'vitest';
import {
  formatBlockCalendarDates,
  buildGoogleCalendarWebUrl,
  generateBacklogIcsContent,
} from '../utils/calendarExport';
import { ScheduleBlock, SyllabusItem } from '../types/tracker';

describe('Google Calendar & iCalendar (.ics) Export Engine', () => {
  const sampleItems: SyllabusItem[] = [
    {
      id: 'item_0001',
      sequence: 1,
      moduleId: 'M4',
      type: 'Class',
      title: 'M4 Class 1/15: Relational DBs & SQL',
      estimatedHours: 2.5,
      completed: false,
    },
  ];

  const sampleBlocks: ScheduleBlock[] = [
    {
      id: 'block_0001',
      date: '2026-08-01',
      dayOfWeek: 'Sat',
      block: 'AM',
      timeWindow: '7:00-9:30 AM',
      targetHours: 2.5,
      isTravelWeekend: false,
      isBuffer: false,
      focusItems: ['M4 Class 1/15: Relational DBs'],
      itemIds: ['item_0001'],
      actualHours: null,
      sleepHours: 7.0,
      notes: '',
      completed: false,
    },
    {
      id: 'block_0002',
      date: '2026-08-01',
      dayOfWeek: 'Sat',
      block: 'PM',
      timeWindow: '6:00-8:30 PM',
      targetHours: 2.5,
      isTravelWeekend: false,
      isBuffer: false,
      focusItems: ['M4 Class 2/15: Advanced SQL'],
      itemIds: [],
      actualHours: 2.5,
      sleepHours: null,
      notes: '',
      completed: true,
    },
  ];

  it('should format ISO block dates correctly for Google Calendar', () => {
    const { startIso, endIso } = formatBlockCalendarDates('2026-08-01', '7:00-9:30 AM');
    expect(startIso).toBe('20260801T070000');
    expect(endIso).toBe('20260801T093000');

    const pmDates = formatBlockCalendarDates('2026-08-01', '6:00-8:30 PM');
    expect(pmDates.startIso).toBe('20260801T180000');
    expect(pmDates.endIso).toBe('20260801T203000');
  });

  it('should generate valid 1-click Google Calendar Web template URL', () => {
    const url = buildGoogleCalendarWebUrl(sampleBlocks[0], sampleItems);
    expect(url).toContain('https://calendar.google.com/calendar/render');
    expect(url).toContain('action=TEMPLATE');
    expect(url).toContain('M4+Class+1%2F15%3A+Relational+DBs');
    expect(url).toContain('20260801T070000%2F20260801T093000');
  });

  it('should generate valid iCalendar (.ics) string containing uncompleted backlog blocks', () => {
    const ics = generateBacklogIcsContent(sampleBlocks, sampleItems);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('SUMMARY:[Scaler Backlog] M4 Class 1/15: Relational DBs & SQL');
    expect(ics).toContain('UID:scaler-backlog-block_0001@tracker');
    // Completed block_0002 should be omitted from backlog export
    expect(ics).not.toContain('scaler-backlog-block_0002');
  });
});
