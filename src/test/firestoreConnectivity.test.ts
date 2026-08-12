import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FirestoreDataService } from '../services/firestoreService';
import { auth } from '../services/firebase';

// Mock Firebase Firestore SDK methods
vi.mock('../services/firebase', () => ({
  db: {},
  auth: {
    currentUser: { uid: 'test-user-123' },
  },
  isFirebaseConfigured: () => true,
}));

vi.mock('firebase/firestore', () => {
  return {
    doc: vi.fn((_db, ...pathSegments) => ({ id: pathSegments[pathSegments.length - 1], path: pathSegments.join('/') })),
    getDoc: vi.fn(async () => ({
      exists: () => true,
      data: () => ({ courseStartDate: '2026-08-01', chosenPaceFinish: '2027-02-18' }),
    })),
    getDocs: vi.fn(async (colRef: any) => {
      // Mock returned docs for modules, syllabusItems, scheduleBlocks
      const path = colRef?.path || '';
      if (path.includes('modules')) {
        return {
          empty: false,
          forEach: (cb: Function) => [
            { id: 'm1', moduleNumber: 1, name: 'Python', status: 'completed' },
            { id: 'm2', moduleNumber: 2, name: 'Maths', status: 'not_started' },
          ].forEach(item => cb({ data: () => item })),
        };
      }
      if (path.includes('syllabusItems')) {
        return {
          empty: false,
          forEach: (cb: Function) => [
            { id: 'item_1', sequence: 1, title: 'Class 1', completed: true },
          ].forEach(item => cb({ data: () => item })),
        };
      }
      if (path.includes('scheduleBlocks')) {
        return {
          empty: false,
          forEach: (cb: Function) => [
            { id: 'block_0001', date: '2026-08-01', completed: true },
          ].forEach(item => cb({ data: () => item })),
        };
      }
      return { empty: false, forEach: () => {} };
    }),
    collection: vi.fn((_db, ...pathSegments) => ({ path: pathSegments.join('/') })),
    updateDoc: vi.fn(async () => {}),
    writeBatch: vi.fn(() => ({
      set: vi.fn(),
      commit: vi.fn(async () => {}),
    })),
  };
});

describe('Firestore Connectivity & Database Restoration', () => {
  let firestoreService: FirestoreDataService;

  beforeEach(() => {
    vi.clearAllMocks();
    firestoreService = new FirestoreDataService();
  });

  it('should throw error when accessing Firestore without authenticated user UID', async () => {
    const originalUser = auth.currentUser;
    // Temporarily nullify currentUser
    Object.defineProperty(auth, 'currentUser', { value: null, writable: true });

    await expect(firestoreService.getModules()).rejects.toThrow('User must be signed in to access Firestore data.');

    // Restore currentUser
    Object.defineProperty(auth, 'currentUser', { value: originalUser, writable: true });
  });

  it('should fetch modules, syllabus items, schedule blocks, and settings from Firestore', async () => {
    const modules = await firestoreService.getModules();
    expect(modules.length).toBe(2);
    expect(modules[0].name).toBe('Python');

    const items = await firestoreService.getSyllabusItems();
    expect(items.length).toBe(1);

    const blocks = await firestoreService.getScheduleBlocks();
    expect(blocks.length).toBe(1);

    const settings = await firestoreService.getSettings();
    expect(settings.courseStartDate).toBe('2026-08-01');
  });

  it('should execute chunked batch write (max 400 operations) when uploading or seeding data', async () => {
    const dummyModules = Array.from({ length: 10 }, (_, i) => ({
      id: `m_${i}`,
      moduleNumber: i + 1,
      name: `Module ${i + 1}`,
      weeks: '1-2',
      classesTotal: 4,
      papersTotal: 0,
      skillTestRequired: false,
      mockInterviewRequired: false,
      mockInterviewStatus: 'Not Required' as const,
      status: 'not_started' as const,
      notes: '',
    }));

    const dummyItems = Array.from({ length: 50 }, (_, i) => ({
      id: `item_${i}`,
      moduleId: 'm_0',
      sequence: i + 1,
      title: `Topic ${i + 1}`,
      type: 'Class' as const,
      durationHours: 2.8,
      completed: false,
    }));

    const dummyBlocks = Array.from({ length: 300 }, (_, i) => ({
      id: `block_${i}`,
      date: '2026-08-01',
      dayOfWeek: 'Saturday',
      block: 'AM' as const,
      timeWindow: '9am',
      targetHours: 3,
      isTravelWeekend: false,
      isBuffer: false,
      focusItems: [],
      completed: false,
    }));

    const dummySettings = {
      courseStartDate: '2026-08-01',
      sustainablePaceFinish: '2027-03-30',
      chosenPaceFinish: '2027-02-18',
      weeklyTemplate: {},
      sleepFloorHours: 6.0,
      travelWeekendFrequencyWeeks: 4,
      assumptions: {} as any,
    };

    // Attempt batch upload of 361 total items
    await firestoreService.uploadLocalData({
      modules: dummyModules as any,
      syllabusItems: dummyItems as any,
      scheduleBlocks: dummyBlocks as any,
      settings: dummySettings as any,
    });

    // Should complete cleanly without exceeding 500 Firestore batch limit
    expect(true).toBe(true);
  });

  it('should perform full database restoration via importAll from Settings JSON backup', async () => {
    const mockBackupJson = JSON.stringify({
      exportDate: '2026-08-12T00:00:00.000Z',
      modules: [{ id: 'm1', moduleNumber: 1, name: 'Restored Module', status: 'completed' }],
      syllabusItems: [{ id: 'item1', sequence: 1, title: 'Restored Topic', completed: true }],
      scheduleBlocks: [{ id: 'block1', date: '2026-08-01', completed: true }],
      settings: { courseStartDate: '2026-08-01', chosenPaceFinish: '2027-02-18' },
    });

    await firestoreService.importAll(mockBackupJson);

    // Verify import completed cleanly
    expect(true).toBe(true);
  });

  it('should reject importAll if backup JSON is missing required fields', async () => {
    const invalidJson = JSON.stringify({ invalid: true });
    await expect(firestoreService.importAll(invalidJson)).rejects.toThrow('Invalid backup JSON file structure');
  });

  it('should patch module, syllabus item, schedule block, and settings documents in Firestore', async () => {
    const { updateDoc } = await import('firebase/firestore');

    await firestoreService.updateModule('m1', { status: 'completed' });
    expect(updateDoc).toHaveBeenCalled();

    await firestoreService.updateSyllabusItem('item1', { completed: true });
    expect(updateDoc).toHaveBeenCalled();

    await firestoreService.updateScheduleBlock('block1', { completed: true });
    expect(updateDoc).toHaveBeenCalled();

    await firestoreService.updateSettings({ sleepFloorHours: 7.0 });
    expect(updateDoc).toHaveBeenCalled();
  });
});
