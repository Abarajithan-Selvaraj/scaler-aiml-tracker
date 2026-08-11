import { describe, it, expect } from 'vitest';
import rawSeedData from '../data/seed_data.json';
import { computeTrackerMetrics } from '../utils/calculations';
import { SeedData } from '../types/tracker';

describe('Metrics & Calculations (FR-13 to FR-17)', () => {
  const seed = rawSeedData as unknown as SeedData;

  it('should compute metrics correctly on default unlogged seed data', () => {
    const metrics = computeTrackerMetrics(
      seed.modules,
      seed.syllabusItems,
      seed.scheduleBlocks,
      seed.settings,
      '2026-08-01'
    );

    expect(metrics.totalItemsCount).toBe(270);
    expect(metrics.totalHoursNeeded).toBeGreaterThan(500);
    expect(metrics.totalHoursLogged).toBe(0);
    expect(metrics.rollingWeeklyPace).toBe(14.0);
    expect(metrics.completionPercentage).toBe(0);
    expect(metrics.isSleepWarningActive).toBe(false);
  });

  it('should trigger sleep warning active when 5 consecutive logged days have < 6h sleep', () => {
    const blocksWithLowSleep = seed.scheduleBlocks.map((b, idx) => {
      if (idx < 10) {
        return {
          ...b,
          actualHours: 2.0,
          sleepHours: 5.0, // Low sleep
        };
      }
      return b;
    });

    const metrics = computeTrackerMetrics(
      seed.modules,
      seed.syllabusItems,
      blocksWithLowSleep,
      seed.settings,
      blocksWithLowSleep[9].date
    );

    expect(metrics.isSleepWarningActive).toBe(true);
  });

  it('should verify synthetic 7-day test fixture matches target finish date', () => {
    const syntheticBlocks = seed.scheduleBlocks.map((b, idx) => {
      if (idx < 14) {
        return {
          ...b,
          actualHours: b.targetHours,
          sleepHours: 7.0,
        };
      }
      return b;
    });

    const metrics = computeTrackerMetrics(
      seed.modules,
      seed.syllabusItems,
      syntheticBlocks,
      seed.settings,
      syntheticBlocks[13].date
    );

    expect(metrics.totalHoursLogged).toBeGreaterThan(0);
    expect(metrics.projectedFinishDate).toBeDefined();
    expect(Math.abs(metrics.finishDeltaDays)).toBeLessThan(30);
  });
});
