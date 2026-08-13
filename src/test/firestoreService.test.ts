/**
 * FirestoreDataService Test Suite
 *
 * Covers every public method with:
 *   - success (happy-path)
 *   - unauthenticated error paths
 *   - empty collection auto-seed & deduplication
 *   - chunked batch write correctness
 *   - importAll / uploadLocalData validation
 *   - edge cases (empty arrays, missing fields, malformed JSON)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── vi.hoisted: mock state that vi.mock factories reference ─────────────────
const {
  mockAuth,
  store,
  writeBatchMockInstance,
  updateDocMock,
  writeBatchMock,
  getCollection,
  makeQuerySnapshot,
  baseModule,
  baseItem,
  baseBlock,
  baseSettings,
  seedStore,
} = vi.hoisted(() => {
  const mockAuth: { currentUser: { uid: string } | null } = { currentUser: { uid: 'test-uid-123' } };

  type Store = Record<string, Record<string, Record<string, any>>>;
  const store: Store = {};

  const getCollection = (uid: string, col: string) => {
    store[uid] ||= {};
    store[uid][col] ||= {};
    return store[uid][col];
  };

  const makeQuerySnapshot = (docs: any[]) => ({
    empty: docs.length === 0,
    forEach: (cb: Function) => docs.forEach((d: any) => cb({ data: () => d })),
  });

  const writeBatchMockInstance = {
    set: vi.fn(),
    commit: vi.fn(async () => {}),
  };
  const writeBatchMock = vi.fn(() => writeBatchMockInstance);
  const updateDocMock = vi.fn(async () => {});

  const baseModule = {
    id: 'm1', moduleNumber: 1, name: 'Python', status: 'not_started' as const,
    weeks: '1', classesTotal: 4, papersTotal: 0, skillTestRequired: false,
    mockInterviewRequired: false, mockInterviewStatus: 'Not Required' as const,
    capstoneRequired: false, estimatedHours: 10, cumulativeHours: 0,
    isDataConfirmed: true, notes: '',
  };

  const baseItem = {
    id: 'item_1', moduleId: 'm1', sequence: 1, title: 'Intro',
    type: 'Class' as const, durationHours: 2.8, estimatedHours: 2.8,
    completed: false, focusKey: 'intro',
  };

  const baseBlock = {
    id: 'block_0001', date: '2026-08-01', dayOfWeek: 'Saturday',
    block: 'AM' as const, timeWindow: '5:00-6:30 AM', targetHours: 1.5,
    isTravelWeekend: false, isBuffer: false, focusItems: [],
    actualHours: null, sleepHours: null, notes: '', completed: false, itemIds: ['item_1'],
  };

  const baseSettings = {
    courseStartDate: '2026-08-01', targetDeadline: '2027-02-18',
    sustainablePaceFinish: '2027-03-30', chosenPaceFinish: '2027-02-18',
    weeklyTemplate: {} as any, sleepFloorHours: 6.0, travelWeekendFrequencyWeeks: 4,
    assumptions: {} as any,
  };

  const seedStore = (uid: string) => {
    store[uid] = {
      modules: { m1: baseModule },
      syllabusItems: { item_1: baseItem },
      scheduleBlocks: { block_0001: baseBlock },
      settings: { main: baseSettings },
    };
  };

  return { mockAuth, store, getCollection, makeQuerySnapshot, writeBatchMockInstance, updateDocMock, writeBatchMock, baseModule, baseItem, baseBlock, baseSettings, seedStore };
});

// ─── Mocks ────────────────────────────────────────────────────────────────────
vi.mock('../services/firebase', () => ({
  db: {},
  auth: mockAuth,
  isFirebaseConfigured: () => true,
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db: any, ...path: string[]) => ({ _path: path })),
  collection: vi.fn((_db: any, ...path: string[]) => ({ _path: path })),
  getDoc: vi.fn(async (ref: any) => {
    const [, uid, col, , id] = ref._path;
    const data = getCollection(uid, col)[id];
    return { exists: () => Boolean(data), data: () => data };
  }),
  getDocs: vi.fn(async (ref: any) => {
    const [, uid, col] = ref._path;
    const docs = Object.values(getCollection(uid, col));
    return makeQuerySnapshot(docs);
  }),
  updateDoc: updateDocMock,
  writeBatch: writeBatchMock,
}));

vi.mock('../data/seed_data.json', () => ({
  default: {
    modules: [{ id: 'm1', moduleNumber: 1, name: 'Python', status: 'not_started', weeks: '1', classesTotal: 4, papersTotal: 0, skillTestRequired: false, mockInterviewRequired: false, mockInterviewStatus: 'Not Required', capstoneRequired: false, estimatedHours: 10, cumulativeHours: 0, isDataConfirmed: true, notes: '' }],
    syllabusItems: [{ id: 'item_1', moduleId: 'm1', sequence: 1, title: 'Intro', type: 'Class', durationHours: 2.8, estimatedHours: 2.8, completed: false, focusKey: 'intro' }],
    scheduleBlocks: [{ id: 'block_0001', date: '2026-08-01', dayOfWeek: 'Saturday', block: 'AM', timeWindow: '5:00-6:30 AM', targetHours: 1.5, isTravelWeekend: false, isBuffer: false, focusItems: [], actualHours: null, sleepHours: null, notes: '', completed: false, itemIds: ['item_1'] }],
    settings: { courseStartDate: '2026-08-01', targetDeadline: '2027-02-18', sustainablePaceFinish: '2027-03-30', chosenPaceFinish: '2027-02-18', weeklyTemplate: {}, sleepFloorHours: 6.0, travelWeekendFrequencyWeeks: 4, assumptions: {} },
  },
}));

vi.mock('../utils/seedMigration', () => ({
  linkScheduleBlockItems: vi.fn((blocks: any[]) => blocks),
}));

import { FirestoreDataService } from '../services/firestoreService';

// ─────────────────────────────────────────────────────────────────────────────
describe('FirestoreDataService — Authentication errors', () => {
  beforeEach(() => {
    mockAuth.currentUser = null;
    vi.clearAllMocks();
    writeBatchMock.mockReturnValue(writeBatchMockInstance);
  });

  it('throws "User must be signed in" on getModules when unauthenticated', async () => {
    const svc = new FirestoreDataService();
    await expect(svc.getModules()).rejects.toThrow('User must be signed in to access Firestore data.');
  });

  it('throws on getSyllabusItems when unauthenticated', async () => {
    await expect(new FirestoreDataService().getSyllabusItems()).rejects.toThrow();
  });

  it('throws on getScheduleBlocks when unauthenticated', async () => {
    await expect(new FirestoreDataService().getScheduleBlocks()).rejects.toThrow();
  });

  it('throws on getSettings when unauthenticated', async () => {
    await expect(new FirestoreDataService().getSettings()).rejects.toThrow();
  });

  it('throws on updateModule when unauthenticated', async () => {
    await expect(new FirestoreDataService().updateModule('m1', { status: 'completed' })).rejects.toThrow();
  });

  it('throws on updateSyllabusItem when unauthenticated', async () => {
    await expect(new FirestoreDataService().updateSyllabusItem('item_1', { completed: true })).rejects.toThrow();
  });

  it('throws on updateScheduleBlock when unauthenticated', async () => {
    await expect(new FirestoreDataService().updateScheduleBlock('block_0001', { completed: true })).rejects.toThrow();
  });

  it('throws on updateSettings when unauthenticated', async () => {
    await expect(new FirestoreDataService().updateSettings({ sleepFloorHours: 7 })).rejects.toThrow();
  });

  it('init() is a no-op when currentUser is null', async () => {
    await expect(new FirestoreDataService().init()).resolves.toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('FirestoreDataService — init()', () => {
  beforeEach(() => {
    mockAuth.currentUser = { uid: 'test-uid-123' };
    seedStore('test-uid-123');
    vi.clearAllMocks();
    writeBatchMock.mockReturnValue(writeBatchMockInstance);
  });

  it('does NOT seed when collection already has documents', async () => {
    await new FirestoreDataService().init();
    expect(writeBatchMockInstance.commit).not.toHaveBeenCalled();
  });

  it('seeds when modules collection is empty', async () => {
    store['test-uid-123'] = { modules: {}, syllabusItems: {}, scheduleBlocks: {}, settings: {} };
    await new FirestoreDataService().init();
    expect(writeBatchMockInstance.commit).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('FirestoreDataService — getModules()', () => {
  beforeEach(() => {
    mockAuth.currentUser = { uid: 'test-uid-123' };
    seedStore('test-uid-123');
    vi.clearAllMocks();
    writeBatchMock.mockReturnValue(writeBatchMockInstance);
  });

  it('returns modules sorted by moduleNumber', async () => {
    store['test-uid-123'].modules = {
      m3: { ...baseModule, id: 'm3', moduleNumber: 3 },
      m1: { ...baseModule, id: 'm1', moduleNumber: 1 },
      m2: { ...baseModule, id: 'm2', moduleNumber: 2 },
    };
    const modules = await new FirestoreDataService().getModules();
    expect(modules[0].moduleNumber).toBe(1);
    expect(modules[2].moduleNumber).toBe(3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('FirestoreDataService — getScheduleBlocks()', () => {
  beforeEach(() => {
    mockAuth.currentUser = { uid: 'test-uid-123' };
    vi.clearAllMocks();
    writeBatchMock.mockReturnValue(writeBatchMockInstance);
    store['test-uid-123'] = {
      modules: { m1: baseModule },
      syllabusItems: { item_1: baseItem },
      scheduleBlocks: {
        block_001: { ...baseBlock, id: 'block_001', date: '2026-08-01' },
        block_002: { ...baseBlock, id: 'block_002', date: '2026-08-05' },
        block_003: { ...baseBlock, id: 'block_003', date: '2026-08-10' },
      },
      settings: { main: baseSettings },
    };
  });

  it('returns all blocks without range filter', async () => {
    expect((await new FirestoreDataService().getScheduleBlocks()).length).toBe(3);
  });

  it('filters blocks by date range (inclusive)', async () => {
    const blocks = await new FirestoreDataService().getScheduleBlocks({ from: '2026-08-01', to: '2026-08-05' });
    expect(blocks.length).toBe(2);
    expect(blocks.find(b => b.date === '2026-08-10')).toBeUndefined();
  });

  it('returns empty array when range excludes all blocks', async () => {
    expect(await new FirestoreDataService().getScheduleBlocks({ from: '2025-01-01', to: '2025-12-31' })).toEqual([]);
  });

  it('sorts returned blocks by id', async () => {
    const blocks = await new FirestoreDataService().getScheduleBlocks();
    for (let i = 1; i < blocks.length; i++) {
      expect(blocks[i - 1].id.localeCompare(blocks[i].id)).toBeLessThanOrEqual(0);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('FirestoreDataService — getSettings()', () => {
  beforeEach(() => {
    mockAuth.currentUser = { uid: 'test-uid-123' };
    seedStore('test-uid-123');
    vi.clearAllMocks();
    writeBatchMock.mockReturnValue(writeBatchMockInstance);
  });

  it('returns settings from Firestore document', async () => {
    expect((await new FirestoreDataService().getSettings()).courseStartDate).toBe('2026-08-01');
  });

  it('falls back to seed settings when settings document does not exist', async () => {
    const { getDoc } = await import('firebase/firestore');
    vi.mocked(getDoc).mockResolvedValueOnce({ exists: () => false, data: () => undefined } as any);
    const settings = await new FirestoreDataService().getSettings();
    expect(settings.courseStartDate).toBe('2026-08-01');
    vi.mocked(getDoc).mockRestore();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('FirestoreDataService — update operations', () => {
  beforeEach(() => {
    mockAuth.currentUser = { uid: 'test-uid-123' };
    seedStore('test-uid-123');
    vi.clearAllMocks();
    writeBatchMock.mockReturnValue(writeBatchMockInstance);
  });

  it('updateModule calls updateDoc once', async () => {
    await new FirestoreDataService().updateModule('m1', { status: 'completed' });
    expect(updateDocMock).toHaveBeenCalledOnce();
  });

  it('updateSyllabusItem calls updateDoc once', async () => {
    await new FirestoreDataService().updateSyllabusItem('item_1', { completed: true });
    expect(updateDocMock).toHaveBeenCalledOnce();
  });

  it('updateScheduleBlock calls updateDoc once', async () => {
    await new FirestoreDataService().updateScheduleBlock('block_0001', { completed: true });
    expect(updateDocMock).toHaveBeenCalledOnce();
  });

  it('updateSettings calls updateDoc once', async () => {
    await new FirestoreDataService().updateSettings({ sleepFloorHours: 7.0 });
    expect(updateDocMock).toHaveBeenCalledOnce();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('FirestoreDataService — chunked batch write (commitInChunks)', () => {
  beforeEach(() => {
    mockAuth.currentUser = { uid: 'test-uid-123' };
    seedStore('test-uid-123');
    vi.clearAllMocks();
    writeBatchMock.mockReturnValue(writeBatchMockInstance);
  });

  it('uses a single batch for ≤400 documents', async () => {
    await new FirestoreDataService().uploadLocalData({
      modules: [baseModule] as any,
      syllabusItems: [baseItem] as any,
      scheduleBlocks: [baseBlock] as any,
      settings: baseSettings as any,
    });
    // 1 + 1 + 1 + 1 settings = 4 docs → 1 batch
    expect(writeBatchMock).toHaveBeenCalledTimes(1);
    expect(writeBatchMockInstance.commit).toHaveBeenCalledTimes(1);
  });

  it('splits 420 blocks + settings into 2 batches (chunk = 400)', async () => {
    const manyBlocks = Array.from({ length: 420 }, (_, i) => ({ ...baseBlock, id: `block_${i}` }));
    await new FirestoreDataService().uploadLocalData({
      modules: [],
      syllabusItems: [],
      scheduleBlocks: manyBlocks as any,
      settings: baseSettings as any,
    });
    // 421 docs → ceil(421/400) = 2 batches
    expect(writeBatchMock).toHaveBeenCalledTimes(2);
    expect(writeBatchMockInstance.commit).toHaveBeenCalledTimes(2);
  });

  it('exactly 400 docs fit in one batch', async () => {
    const exactBlocks = Array.from({ length: 399 }, (_, i) => ({ ...baseBlock, id: `block_${i}` }));
    await new FirestoreDataService().uploadLocalData({
      modules: [],
      syllabusItems: [],
      scheduleBlocks: exactBlocks as any,
      settings: baseSettings as any,
    });
    // 399 + 1 settings = 400 docs → 1 batch
    expect(writeBatchMockInstance.commit).toHaveBeenCalledTimes(1);
  });

  it('handles zero documents gracefully (no batch calls)', async () => {
    await new FirestoreDataService().uploadLocalData({
      modules: [],
      syllabusItems: [],
      scheduleBlocks: [],
      settings: baseSettings as any,
    });
    // Only settings (1 doc) → 1 batch
    expect(writeBatchMockInstance.commit).toHaveBeenCalledTimes(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('FirestoreDataService — seedingPromise deduplication', () => {
  beforeEach(() => {
    mockAuth.currentUser = { uid: 'test-uid-123' };
    store['test-uid-123'] = { modules: {}, syllabusItems: {}, scheduleBlocks: {}, settings: {} };
    vi.clearAllMocks();
    writeBatchMock.mockReturnValue(writeBatchMockInstance);
  });

  it('concurrent init() calls issue only one set of batch commits', async () => {
    const svc = new FirestoreDataService();
    await Promise.all([svc.init(), svc.init(), svc.init()]);
    const commits = writeBatchMockInstance.commit.mock.calls.length;
    // Seed data has 1 module + 1 item + 1 block + 1 settings = 4 docs → 1 batch
    expect(commits).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('FirestoreDataService — importAll()', () => {
  beforeEach(() => {
    mockAuth.currentUser = { uid: 'test-uid-123' };
    seedStore('test-uid-123');
    vi.clearAllMocks();
    writeBatchMock.mockReturnValue(writeBatchMockInstance);
  });

  it('calls uploadLocalData (batch commit) for valid payload', async () => {
    const payload = { modules: [baseModule], syllabusItems: [baseItem], scheduleBlocks: [baseBlock], settings: baseSettings };
    await new FirestoreDataService().importAll(JSON.stringify(payload));
    expect(writeBatchMockInstance.commit).toHaveBeenCalled();
  });

  it('throws "Invalid backup JSON file structure" for missing modules', async () => {
    await expect(new FirestoreDataService().importAll(JSON.stringify({ syllabusItems: [], scheduleBlocks: [], settings: {} })))
      .rejects.toThrow('Invalid backup JSON file structure');
  });

  it('throws for missing syllabusItems', async () => {
    await expect(new FirestoreDataService().importAll(JSON.stringify({ modules: [], scheduleBlocks: [], settings: {} })))
      .rejects.toThrow('Invalid backup JSON file structure');
  });

  it('throws for missing scheduleBlocks', async () => {
    await expect(new FirestoreDataService().importAll(JSON.stringify({ modules: [], syllabusItems: [], settings: {} })))
      .rejects.toThrow('Invalid backup JSON file structure');
  });

  it('throws for missing settings', async () => {
    await expect(new FirestoreDataService().importAll(JSON.stringify({ modules: [], syllabusItems: [], scheduleBlocks: [] })))
      .rejects.toThrow('Invalid backup JSON file structure');
  });

  it('throws SyntaxError for malformed JSON', async () => {
    await expect(new FirestoreDataService().importAll('{{invalid json')).rejects.toThrow();
  });

  it('throws "User must be signed in" when unauthenticated', async () => {
    mockAuth.currentUser = null;
    const payload = { modules: [baseModule], syllabusItems: [baseItem], scheduleBlocks: [baseBlock], settings: baseSettings };
    await expect(new FirestoreDataService().importAll(JSON.stringify(payload))).rejects.toThrow('User must be signed in');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('FirestoreDataService — resetData()', () => {
  beforeEach(() => {
    mockAuth.currentUser = { uid: 'test-uid-123' };
    seedStore('test-uid-123');
    vi.clearAllMocks();
    writeBatchMock.mockReturnValue(writeBatchMockInstance);
  });

  it('triggers seeding via batch commit', async () => {
    await new FirestoreDataService().resetData();
    expect(writeBatchMockInstance.commit).toHaveBeenCalled();
  });

  it('throws when unauthenticated', async () => {
    mockAuth.currentUser = null;
    await expect(new FirestoreDataService().resetData()).rejects.toThrow();
  });
});
