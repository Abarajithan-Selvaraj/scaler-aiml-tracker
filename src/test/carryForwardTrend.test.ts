import { describe, it, expect, beforeEach } from 'vitest';
import { useTrackerStore } from '../store/useTrackerStore';
import { computeTrackerMetrics } from '../utils/calculations';

describe('Deficit Rollover & Fast Completion Efficiency', () => {
  beforeEach(async () => {
    await useTrackerStore.getState().resetToSeed();
    await useTrackerStore.getState().loadData();
  });

  it('should calculate zero carried-forward deficit when logged hours match targets', () => {
    const store = useTrackerStore.getState();
    const startDate = store.settings!.courseStartDate;

    const loggedBlocks = store.scheduleBlocks.map((b) =>
      b.date === startDate ? { ...b, actualHours: b.targetHours, completed: true } : b
    );

    const metrics = computeTrackerMetrics(
      store.modules,
      store.syllabusItems,
      loggedBlocks,
      store.settings!,
      startDate
    );

    expect(metrics.carriedForwardDeficitHours).toBe(0);
    expect(metrics.effectiveHoursRemaining).toBeCloseTo(metrics.totalHoursRemaining, 1);
  });

  it('should NOT generate a deficit when 4.0h of content is completed in 3.0h actual time', () => {
    const store = useTrackerStore.getState();
    const startDate = store.settings!.courseStartDate;

    // Fast completion on day 1: AM block target 4.0h, actual 3.0h, completed = true; PM block target 2.5h, actual 2.5h, completed = true
    const modifiedBlocks = store.scheduleBlocks.map((b, idx) => {
      if (idx === 0) return { ...b, targetHours: 4.0, actualHours: 3.0, completed: true };
      if (idx === 1) return { ...b, targetHours: 2.5, actualHours: 2.5, completed: true };
      return b;
    });

    const metrics = computeTrackerMetrics(
      store.modules,
      store.syllabusItems,
      modifiedBlocks,
      store.settings!,
      startDate
    );

    // Because the 4h block is completed in 3h, no deficit is generated for that block!
    expect(metrics.carriedForwardDeficitHours).toBe(0);
  });

  it('should carry forward missed study target hours into deficit for uncompleted blocks', () => {
    const store = useTrackerStore.getState();
    const startDate = store.settings!.courseStartDate;
    const day1Blocks = store.scheduleBlocks.filter((b) => b.date === startDate);
    const day1TargetSum = day1Blocks.reduce((sum, b) => sum + b.targetHours, 0);

    // Day 1 blocks missed (actualHours = 0, completed = false)
    const modifiedBlocks = store.scheduleBlocks.map((b) =>
      b.date === startDate ? { ...b, actualHours: 0, completed: false } : b
    );

    const metrics = computeTrackerMetrics(
      store.modules,
      store.syllabusItems,
      modifiedBlocks,
      store.settings!,
      startDate
    );

    expect(metrics.carriedForwardDeficitHours).toBe(day1TargetSum);
    expect(metrics.effectiveHoursRemaining).toBeCloseTo(
      metrics.totalHoursRemaining + day1TargetSum,
      1
    );
  });

  it('should shift projected finish date forward when deficit accumulates', () => {
    const store = useTrackerStore.getState();
    const testDate = store.scheduleBlocks[10].date;

    const targetBlocks = store.scheduleBlocks.map((b) =>
      b.date <= testDate ? { ...b, actualHours: b.targetHours, completed: true } : b
    );

    const baseMetrics = computeTrackerMetrics(
      store.modules,
      store.syllabusItems,
      targetBlocks,
      store.settings!,
      testDate
    );

    const missedBlocks = store.scheduleBlocks.map((b) =>
      b.date <= testDate ? { ...b, actualHours: 0, completed: false } : b
    );

    const deficitMetrics = computeTrackerMetrics(
      store.modules,
      store.syllabusItems,
      missedBlocks,
      store.settings!,
      testDate
    );

    expect(deficitMetrics.carriedForwardDeficitHours).toBeGreaterThan(0);
    expect(deficitMetrics.effectiveHoursRemaining).toBeGreaterThan(
      baseMetrics.effectiveHoursRemaining
    );
    expect(
      new Date(deficitMetrics.projectedFinishDate).getTime()
    ).toBeGreaterThan(new Date(baseMetrics.projectedFinishDate).getTime());
  });
});
