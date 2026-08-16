import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseFocusItemHours, cleanFocusTitle } from '../utils/seedMigration';

describe('Rescheduling & Split Session Utility Tests', () => {
  it('parses split session hours accurately from focusItem string', () => {
    const focusStr = 'M4 Class 1/15: Intro to Python (part 1.4h of 2.8h)';
    const parsed = parseFocusItemHours(focusStr, 2.8);
    expect(parsed).toBe(1.4);
  });

  it('returns fallback hours if focusItem does not specify part hours', () => {
    const focusStr = 'M4 Class 1/15: Intro to Python';
    const parsed = parseFocusItemHours(focusStr, 2.8);
    expect(parsed).toBe(2.8);
  });

  it('cleans focus title by stripping part duration suffix', () => {
    const focusStr = 'M4 Class 1/15: Intro to Python (part 1.4h of 2.8h)';
    const cleaned = cleanFocusTitle(focusStr);
    expect(cleaned).toBe('M4 Class 1/15: Intro to Python');
  });
});
