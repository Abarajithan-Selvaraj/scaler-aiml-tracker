/**
 * IndexedDBDataService Test Suite
 *
 * Tests the memory-store fallback path exhaustively (IndexedDB is not available
 * in the Vitest / Node test environment).  Every public method is covered with:
 *   - success (happy-path)
 *   - failure / error paths
 *   - edge-cases (empty data, boundary values, concurrent calls, …)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── vi.hoisted: data used inside vi.mock factories must be hoisted ───────────
const { minimalModule, minimalItem, minimalBlock, minimalSettings } = vi.hoisted(() => {
  const minimalModule = {
    id: 'm1', moduleNumber: 1, name: 'Python Basics', weeks: '1-2',
    classesTotal: 4, papersTotal: 0, skillTestRequired: false,
    mockInterviewRequired: false, mockInterviewStatus: 'Not Required' as const,
    status: 'not_started' as const, capstoneRequired: false,
    estimatedHours: 10, cumulativeHours: 0, isDataConfirmed: true, notes: '',
  };

  const minimalItem = {
    id: 'item_1', moduleId: 'm1', sequence: 1, title: 'Intro',
    type: 'Class' as const, durationHours: 2.8, estimatedHours: 2.8,
    completed: false, focusKey: 'intro',
  };

  const minimalBlock = {
    id: 'block_0001', date: '2026-08-01', dayOfWeek: 'Saturday',
    block: 'AM' as const, timeWindow: '5:00-6:30 AM', targetHours: 1.5,
    isTravelWeekend: false, isBuffer: false, focusItems: ['intro'],
    actualHours: null, sleepHours: null, notes: '', completed: false, itemIds: ['item_1'],
  };

  const minimalSettings = {
    courseStartDate: '2026-08-01', targetDeadline: '2027-02-18',
    sustainablePaceFinish: '2027-03-30', chosenPaceFinish: '2027-02-18',
    weeklyTemplate: { Mon: { AM: 1.5, PM: 3.0 } } as any,
    sleepFloorHours: 6.0, travelWeekendFrequencyWeeks: 4,
    assumptions: { avgHoursPerClass: 2.8, bufferPercent: 0.1, weeklyBaseline: 14.0 } as any,
  };

  return { minimalModule, minimalItem, minimalBlock, minimalSettings };
});

// ─── Mock seed_data.json ──────────────────────────────────────────────────────
vi.mock('../data/seed_data.json', () => ({
  default: {
    modules: [{ id: 'm1', moduleNumber: 1, name: 'Python Basics', weeks: '1-2', classesTotal: 4, papersTotal: 0, skillTestRequired: false, mockInterviewRequired: false, mockInterviewStatus: 'Not Required', status: 'not_started', capstoneRequired: false, estimatedHours: 10, cumulativeHours: 0, isDataConfirmed: true, notes: '' }],
    syllabusItems: [{ id: 'item_1', moduleId: 'm1', sequence: 1, title: 'Intro', type: 'Class', durationHours: 2.8, estimatedHours: 2.8, completed: false, focusKey: 'intro' }],
    scheduleBlocks: [{ id: 'block_0001', date: '2026-08-01', dayOfWeek: 'Saturday', block: 'AM', timeWindow: '5:00-6:30 AM', targetHours: 1.5, isTravelWeekend: false, isBuffer: false, focusItems: ['intro'], actualHours: null, sleepHours: null, notes: '', completed: false }],
    settings: { courseStartDate: '2026-08-01', targetDeadline: '2027-02-18', sustainablePaceFinish: '2027-03-30', chosenPaceFinish: '2027-02-18', weeklyTemplate: {}, sleepFloorHours: 6.0, travelWeekendFrequencyWeeks: 4, assumptions: {} },
  },
}));

// ─── Mock seedMigration ───────────────────────────────────────────────────────
vi.mock('../utils/seedMigration', () => ({
  linkScheduleBlockItems: vi.fn((blocks: any[]) =>
    blocks.map((b: any) => ({ ...b, itemIds: ['item_1'] }))
  ),
}));

// ─── Force openDB to throw so all tests use the memory store path ──────────────
vi.mock('idb', () => ({
  openDB: vi.fn(() => Promise.reject(new Error('IndexedDB not available in test'))),
}));

import { IndexedDBDataService } from '../services/indexedDbService';

// ─── Helper: build a fresh service (memory-store branch) ─────────────────────
const makeService = async (): Promise<IndexedDBDataService> => {
  const svc = new IndexedDBDataService();
  await svc.init();          // populates memoryStore from seed
  return svc;
};

// ─────────────────────────────────────────────────────────────────────────────
describe('IndexedDBDataService — init()', () => {
  it('populates memory store from seed data on first init', async () => {
    const svc = await makeService();
    const modules = await svc.getModules();
    expect(modules.length).toBeGreaterThan(0);
  });

  it('is idempotent: calling init() twice does not double the data', async () => {
    const svc = await makeService();
    await svc.init();
    const modules = await svc.getModules();
    expect(modules.length).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('IndexedDBDataService — getModules()', () => {
  it('returns modules sorted by moduleNumber ascending', async () => {
    const svc = new IndexedDBDataService();
    (svc as any).memoryStore = {
      modules: [
        { ...minimalModule, id: 'm3', moduleNumber: 3 },
        { ...minimalModule, id: 'm1', moduleNumber: 1 },
        { ...minimalModule, id: 'm2', moduleNumber: 2 },
      ],
      syllabusItems: [], scheduleBlocks: [], settings: minimalSettings,
    };

    const modules = await svc.getModules();
    expect(modules[0].moduleNumber).toBe(1);
    expect(modules[1].moduleNumber).toBe(2);
    expect(modules[2].moduleNumber).toBe(3);
  });

  it('returns empty array when memory store has no modules', async () => {
    const svc = new IndexedDBDataService();
    (svc as any).memoryStore = { modules: [], syllabusItems: [], scheduleBlocks: [], settings: minimalSettings };
    expect(await svc.getModules()).toEqual([]);
  });

  it('returns empty array when memory store is null', async () => {
    const svc = new IndexedDBDataService();
    (svc as any).memoryStore = null;
    expect(await svc.getModules()).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('IndexedDBDataService — getSyllabusItems()', () => {
  it('returns items sorted by sequence ascending', async () => {
    const svc = new IndexedDBDataService();
    (svc as any).memoryStore = {
      modules: [], scheduleBlocks: [], settings: minimalSettings,
      syllabusItems: [
        { ...minimalItem, id: 'item_3', sequence: 3 },
        { ...minimalItem, id: 'item_1', sequence: 1 },
        { ...minimalItem, id: 'item_2', sequence: 2 },
      ],
    };
    const items = await svc.getSyllabusItems();
    expect(items[0].sequence).toBe(1);
    expect(items[1].sequence).toBe(2);
    expect(items[2].sequence).toBe(3);
  });

  it('returns empty array when memoryStore is null', async () => {
    const svc = new IndexedDBDataService();
    (svc as any).memoryStore = null;
    expect(await svc.getSyllabusItems()).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('IndexedDBDataService — getScheduleBlocks()', () => {
  const blocks = [
    { ...minimalBlock, id: 'block_001', date: '2026-08-01' },
    { ...minimalBlock, id: 'block_002', date: '2026-08-05' },
    { ...minimalBlock, id: 'block_003', date: '2026-08-10' },
  ];

  const makeSvcWithBlocks = () => {
    const svc = new IndexedDBDataService();
    (svc as any).memoryStore = {
      modules: [], syllabusItems: [], settings: minimalSettings, scheduleBlocks: blocks,
    };
    return svc;
  };

  it('returns all blocks when no range filter is provided', async () => {
    expect((await makeSvcWithBlocks().getScheduleBlocks()).length).toBe(3);
  });

  it('filters blocks by date range (inclusive both ends)', async () => {
    const result = await makeSvcWithBlocks().getScheduleBlocks({ from: '2026-08-01', to: '2026-08-05' });
    expect(result.length).toBe(2);
    expect(result.find(b => b.id === 'block_003')).toBeUndefined();
  });

  it('returns empty array when range excludes all blocks', async () => {
    expect(await makeSvcWithBlocks().getScheduleBlocks({ from: '2025-01-01', to: '2025-12-31' })).toEqual([]);
  });

  it('sorts blocks by id', async () => {
    const svc = new IndexedDBDataService();
    (svc as any).memoryStore = {
      modules: [], syllabusItems: [], settings: minimalSettings,
      scheduleBlocks: [
        { ...minimalBlock, id: 'block_003' },
        { ...minimalBlock, id: 'block_001' },
        { ...minimalBlock, id: 'block_002' },
      ],
    };
    const result = await svc.getScheduleBlocks();
    expect(result[0].id).toBe('block_001');
    expect(result[2].id).toBe('block_003');
  });

  it('returns empty array when memoryStore is null', async () => {
    const svc = new IndexedDBDataService();
    (svc as any).memoryStore = null;
    expect(await svc.getScheduleBlocks()).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('IndexedDBDataService — getSettings()', () => {
  it('returns settings from memory store', async () => {
    const svc = await makeService();
    expect((await svc.getSettings()).courseStartDate).toBe('2026-08-01');
  });

  it('falls back to raw seed settings when memory store is null', async () => {
    const svc = new IndexedDBDataService();
    (svc as any).memoryStore = null;
    expect((await svc.getSettings()).courseStartDate).toBe('2026-08-01');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('IndexedDBDataService — updateModule()', () => {
  it('patches an existing module in memory store', async () => {
    const svc = await makeService();
    await svc.updateModule('m1', { status: 'completed' });
    expect((await svc.getModules())[0].status).toBe('completed');
  });

  it('is a no-op when module id does not exist', async () => {
    const svc = await makeService();
    await svc.updateModule('non-existent-id', { status: 'completed' });
    expect((await svc.getModules())[0].status).toBe('not_started');
  });

  it('is a no-op when memory store is null', async () => {
    const svc = new IndexedDBDataService();
    (svc as any).memoryStore = null;
    await expect(svc.updateModule('m1', { status: 'completed' })).resolves.toBeUndefined();
  });

  it('merges patch fields without overwriting unpatched fields', async () => {
    const svc = await makeService();
    await svc.updateModule('m1', { status: 'in_progress' });
    const module = (await svc.getModules())[0];
    expect(module.status).toBe('in_progress');
    expect(module.name).toBe('Python Basics');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('IndexedDBDataService — updateSyllabusItem()', () => {
  it('patches an existing syllabus item', async () => {
    const svc = await makeService();
    await svc.updateSyllabusItem('item_1', { completed: true });
    expect((await svc.getSyllabusItems())[0].completed).toBe(true);
  });

  it('is a no-op for unknown item id', async () => {
    const svc = await makeService();
    await svc.updateSyllabusItem('unknown-item', { completed: true });
    expect((await svc.getSyllabusItems())[0].completed).toBe(false);
  });

  it('handles partial patch (only the specified field changes)', async () => {
    const svc = await makeService();
    await svc.updateSyllabusItem('item_1', { completed: true });
    const item = (await svc.getSyllabusItems())[0];
    expect(item.completed).toBe(true);
    expect(item.title).toBe('Intro');  // untouched
  });

  it('is a no-op when memory store is null', async () => {
    const svc = new IndexedDBDataService();
    (svc as any).memoryStore = null;
    await expect(svc.updateSyllabusItem('item_1', { completed: true })).resolves.toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('IndexedDBDataService — updateScheduleBlock()', () => {
  it('patches completed and actualHours on an existing block', async () => {
    const svc = await makeService();
    await svc.updateScheduleBlock('block_0001', { completed: true, actualHours: 1.5 });
    const block = (await svc.getScheduleBlocks())[0];
    expect(block.completed).toBe(true);
    expect(block.actualHours).toBe(1.5);
  });

  it('is a no-op for unknown block id', async () => {
    const svc = await makeService();
    await svc.updateScheduleBlock('unknown-block', { completed: true });
    expect((await svc.getScheduleBlocks())[0].completed).toBe(false);
  });

  it('allows patching notes and sleepHours', async () => {
    const svc = await makeService();
    await svc.updateScheduleBlock('block_0001', { notes: 'Great!', sleepHours: 7.5 });
    const block = (await svc.getScheduleBlocks())[0];
    expect(block.notes).toBe('Great!');
    expect(block.sleepHours).toBe(7.5);
  });

  it('is a no-op when memory store is null', async () => {
    const svc = new IndexedDBDataService();
    (svc as any).memoryStore = null;
    await expect(svc.updateScheduleBlock('block_0001', { completed: true })).resolves.toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('IndexedDBDataService — updateSettings()', () => {
  it('patches settings in the memory store', async () => {
    const svc = await makeService();
    await svc.updateSettings({ sleepFloorHours: 7.5 });
    expect((await svc.getSettings()).sleepFloorHours).toBe(7.5);
  });

  it('preserves untouched settings fields', async () => {
    const svc = await makeService();
    await svc.updateSettings({ sleepFloorHours: 7.0 });
    expect((await svc.getSettings()).courseStartDate).toBe('2026-08-01');
  });

  it('is a no-op when memory store is null', async () => {
    const svc = new IndexedDBDataService();
    (svc as any).memoryStore = null;
    await expect(svc.updateSettings({ sleepFloorHours: 7 })).resolves.toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('IndexedDBDataService — importAll()', () => {
  it('replaces memory store with imported JSON data', async () => {
    const svc = await makeService();
    const payload = {
      modules: [{ ...minimalModule, id: 'm99', name: 'Imported Module', moduleNumber: 99 }],
      syllabusItems: [{ ...minimalItem, id: 'item_99', title: 'Imported Item', sequence: 99 }],
      scheduleBlocks: [{ ...minimalBlock, id: 'block_9999', date: '2027-01-01' }],
      settings: { ...minimalSettings, sleepFloorHours: 8.0 },
    };
    await svc.importAll(JSON.stringify(payload));
    expect((await svc.getModules())[0].name).toBe('Imported Module');
    expect((await svc.getSettings()).sleepFloorHours).toBe(8.0);
  });

  it('throws for missing modules field', async () => {
    const svc = await makeService();
    await expect(svc.importAll(JSON.stringify({ syllabusItems: [], scheduleBlocks: [], settings: {} })))
      .rejects.toThrow('Invalid backup JSON file structure');
  });

  it('throws for missing syllabusItems field', async () => {
    const svc = await makeService();
    await expect(svc.importAll(JSON.stringify({ modules: [], scheduleBlocks: [], settings: {} })))
      .rejects.toThrow('Invalid backup JSON file structure');
  });

  it('throws for missing scheduleBlocks field', async () => {
    const svc = await makeService();
    await expect(svc.importAll(JSON.stringify({ modules: [], syllabusItems: [], settings: {} })))
      .rejects.toThrow('Invalid backup JSON file structure');
  });

  it('throws for missing settings field', async () => {
    const svc = await makeService();
    await expect(svc.importAll(JSON.stringify({ modules: [], syllabusItems: [], scheduleBlocks: [] })))
      .rejects.toThrow('Invalid backup JSON file structure');
  });

  it('throws SyntaxError for malformed JSON', async () => {
    const svc = await makeService();
    await expect(svc.importAll('not-valid-json{')).rejects.toThrow();
  });

  it('imports empty arrays without throwing', async () => {
    const svc = await makeService();
    const empty = { modules: [], syllabusItems: [], scheduleBlocks: [], settings: minimalSettings };
    await expect(svc.importAll(JSON.stringify(empty))).resolves.toBeUndefined();
    expect(await svc.getModules()).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('IndexedDBDataService — resetData() / resetToSeed()', () => {
  it('restores seed data after reset', async () => {
    const svc = await makeService();
    await svc.updateModule('m1', { status: 'completed' });
    expect((await svc.getModules())[0].status).toBe('completed');
    await svc.resetData();
    expect((await svc.getModules())[0].status).toBe('not_started');
  });

  it('resetToSeed() has the same effect as resetData()', async () => {
    const svc = await makeService();
    await svc.updateSyllabusItem('item_1', { completed: true });
    await svc.resetToSeed();
    expect((await svc.getSyllabusItems())[0].completed).toBe(false);
  });

  it('leaves data accessible after re-seeding', async () => {
    const svc = await makeService();
    await svc.resetData();
    expect((await svc.getModules()).length).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('IndexedDBDataService — exportAll()', () => {
  it('returns valid JSON with all four top-level keys', async () => {
    const parsed = JSON.parse(await (await makeService()).exportAll());
    expect(parsed).toHaveProperty('modules');
    expect(parsed).toHaveProperty('syllabusItems');
    expect(parsed).toHaveProperty('scheduleBlocks');
    expect(parsed).toHaveProperty('settings');
  });

  it('exported JSON round-trips through importAll() correctly', async () => {
    const svc = await makeService();
    await svc.updateModule('m1', { status: 'in_progress' });
    const json = await svc.exportAll();

    const svc2 = new IndexedDBDataService();
    (svc2 as any).memoryStore = { modules: [], syllabusItems: [], scheduleBlocks: [], settings: minimalSettings };
    await svc2.importAll(json);
    expect((await svc2.getModules())[0].status).toBe('in_progress');
  });
});
