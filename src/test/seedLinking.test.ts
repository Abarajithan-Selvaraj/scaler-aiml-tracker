import { describe, it, expect } from 'vitest';
import rawSeedData from '../data/seed_data.json';
import { linkScheduleBlockItems, cleanFocusTitle } from '../utils/seedMigration';
import { SeedData } from '../types/tracker';

describe('Seed Data & Linking Migration (Section 5.5)', () => {
  const seed = rawSeedData as unknown as SeedData;

  it('should clean focus title suffixes correctly', () => {
    expect(cleanFocusTitle('M4 Class 1/15: Relational DBs (part 1.2h of 2.8h)')).toBe(
      'M4 Class 1/15: Relational DBs'
    );
    expect(cleanFocusTitle('M6 Research Paper 2/2 (part 0.5h of 1.5h)')).toBe('M6 Research Paper 2/2');
    expect(cleanFocusTitle('M14 Class 3/10: Git Setup')).toBe('M14 Class 3/10: Git Setup');
  });

  it('should link schedule block focus strings to SyllabusItem.id array', () => {
    const linkedBlocks = linkScheduleBlockItems(seed.scheduleBlocks, seed.syllabusItems);

    expect(linkedBlocks.length).toBe(404);
    const linkedCount = linkedBlocks.filter((b) => b.itemIds && b.itemIds.length > 0).length;
    expect(linkedCount).toBeGreaterThan(300); // 311 syllabus content blocks linked
  });

  it('should verify exactly 15 modules and 270 syllabus items in seed data', () => {
    expect(seed.modules.length).toBe(15);
    expect(seed.syllabusItems.length).toBe(270);
    expect(seed.scheduleBlocks.length).toBe(404);
  });
});
