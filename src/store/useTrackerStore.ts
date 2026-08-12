import { create } from 'zustand';
import { Module, ScheduleBlock, Settings, SyllabusItem } from '../types/tracker';
import { getDataService } from '../services/dataService';
import { computeTrackerMetrics, TrackerMetrics } from '../utils/calculations';
import { auth, isFirebaseConfigured } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { firestoreService } from '../services/firestoreService';
import { indexedDbService } from '../services/indexedDbService';

/**
 * Calculates whether a Class item should be automatically marked completed
 * based on its active sub-components (Video, Assignment, Additional Problems).
 */
export function isClassItemFullyCompleted(item: SyllabusItem): boolean {
  if (item.type !== 'Class') {
    return item.completed;
  }

  const videoOk = item.hasVideo !== false ? Boolean(item.videoCompleted) : true;
  const assignmentOk = item.hasAssignment !== false ? Boolean(item.assignmentCompleted) : true;
  const additionalOk = item.hasAdditionalProblems !== false ? Boolean(item.additionalProblemsCompleted) : true;

  return videoOk && assignmentOk && additionalOk;
}

/**
 * Ensures default sub-component flags exist on a SyllabusItem.
 */
export function normalizeSyllabusItem(item: SyllabusItem): SyllabusItem {
  if (item.type !== 'Class') return item;

  const hasVideo = item.hasVideo !== false;
  const hasAssignment = item.hasAssignment !== false;
  const hasAdditionalProblems = item.hasAdditionalProblems !== false;

  const videoCompleted = item.videoCompleted ?? item.completed;
  const assignmentCompleted = item.assignmentCompleted ?? item.completed;
  const additionalProblemsCompleted = item.additionalProblemsCompleted ?? item.completed;

  const completed = isClassItemFullyCompleted({
    ...item,
    hasVideo,
    videoCompleted,
    hasAssignment,
    assignmentCompleted,
    hasAdditionalProblems,
    additionalProblemsCompleted,
  });

  return {
    ...item,
    hasVideo,
    videoCompleted,
    hasAssignment,
    assignmentCompleted,
    hasAdditionalProblems,
    additionalProblemsCompleted,
    completed,
  };
}

interface TrackerState {
  modules: Module[];
  syllabusItems: SyllabusItem[];
  scheduleBlocks: ScheduleBlock[];
  settings: Settings | null;
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
  currentDateStr: string;
  activeBackend: 'indexeddb' | 'firestore';

  // Actions
  loadData: () => Promise<void>;
  setupAuthListener: () => () => void;
  syncLocalToCloud: () => Promise<void>;
  toggleItemCompletion: (itemId: string) => Promise<void>;
  toggleSubComponentCompletion: (
    itemId: string,
    subComponent: 'video' | 'assignment' | 'additional'
  ) => Promise<void>;
  updateBlockLog: (
    blockId: string,
    patch: { actualHours?: number | null; sleepHours?: number | null; notes?: string; completed?: boolean }
  ) => Promise<void>;
  updateModuleData: (moduleId: string, patch: Partial<Module>) => Promise<void>;
  updateSettingsData: (patch: Partial<Settings>) => Promise<void>;
  setCurrentDateStr: (dateIso: string) => void;
  exportData: () => Promise<string>;
  importData: (json: string) => Promise<void>;
  resetToSeed: () => Promise<void>;
  getMetrics: () => TrackerMetrics | null;
}

export const useTrackerStore = create<TrackerState>((set, get) => ({
  modules: [],
  syllabusItems: [],
  scheduleBlocks: [],
  settings: null,
  isLoading: true,
  isSyncing: false,
  error: null,
  currentDateStr: new Date().toISOString().split('T')[0],
  activeBackend: 'indexeddb',

  setupAuthListener: () => {
    if (!isFirebaseConfigured() || !auth) {
      get().loadData();
      return () => {};
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        set({ activeBackend: 'firestore' });
        await get().loadData();
      } else {
        set({ activeBackend: 'indexeddb' });
        await get().loadData();
      }
    });

    return unsubscribe;
  },

  syncLocalToCloud: async () => {
    if (!auth?.currentUser || !isFirebaseConfigured()) return;
    set({ isSyncing: true });
    try {
      // Read local IndexedDB data
      await indexedDbService.init();
      const [modules, rawItems, scheduleBlocks, settings] = await Promise.all([
        indexedDbService.getModules(),
        indexedDbService.getSyllabusItems(),
        indexedDbService.getScheduleBlocks(),
        indexedDbService.getSettings(),
      ]);

      const syllabusItems = rawItems.map(normalizeSyllabusItem);

      // Upload local state to Firestore
      await firestoreService.uploadLocalData({
        modules,
        syllabusItems,
        scheduleBlocks,
        settings,
      });

      // Switch active backend and reload
      set({ activeBackend: 'firestore' });
      await get().loadData();
    } catch (err: any) {
      console.error('Failed to sync local data to cloud:', err);
    } finally {
      set({ isSyncing: false });
    }
  },

  loadData: async () => {
    set({ isLoading: true, error: null });
    try {
      const dataService = getDataService(get().activeBackend);
      await dataService.init();

      const [modules, rawSyllabusItems, scheduleBlocks, settings] = await Promise.all([
        dataService.getModules(),
        dataService.getSyllabusItems(),
        dataService.getScheduleBlocks(),
        dataService.getSettings(),
      ]);

      const syllabusItems = rawSyllabusItems.map(normalizeSyllabusItem);
      const courseStart = settings?.courseStartDate || '2026-08-01';
      const effectiveDate = settings?.simulatedDate || courseStart;

      set({
        modules,
        syllabusItems,
        scheduleBlocks,
        settings,
        currentDateStr: effectiveDate,
        isLoading: false,
      });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to load tracker data', isLoading: false });
    }
  },

  toggleItemCompletion: async (itemId: string) => {
    const { syllabusItems, modules, scheduleBlocks, activeBackend } = get();
    const item = syllabusItems.find(i => i.id === itemId);
    if (!item) return;

    const newCompleted = !item.completed;
    const dataService = getDataService(activeBackend);

    const patch: Partial<SyllabusItem> = {
      completed: newCompleted,
    };

    if (item.type === 'Class') {
      patch.videoCompleted = newCompleted;
      patch.assignmentCompleted = newCompleted;
      patch.additionalProblemsCompleted = newCompleted;
    }

    await dataService.updateSyllabusItem(itemId, patch);

    const updatedSyllabusItems = syllabusItems.map(i =>
      i.id === itemId ? { ...i, ...patch } : i
    );

    // Update parent module completion stats
    const moduleItems = updatedSyllabusItems.filter(i => i.moduleId === item.moduleId);
    const moduleCompletedCount = moduleItems.filter(i => i.completed).length;
    const moduleStatus: 'not_started' | 'in_progress' | 'completed' =
      moduleCompletedCount === moduleItems.length
        ? 'completed'
        : moduleCompletedCount > 0
        ? 'in_progress'
        : 'not_started';

    await dataService.updateModule(item.moduleId, { status: moduleStatus });

    const updatedModules: Module[] = modules.map(m =>
      m.id === item.moduleId ? { ...m, status: moduleStatus } : m
    );

    // Update schedule blocks referencing this item
    const updatedBlocks = [...scheduleBlocks];
    for (const block of updatedBlocks) {
      if (block.itemIds?.includes(itemId)) {
        const blockItems = updatedSyllabusItems.filter(i => block.itemIds?.includes(i.id));
        const blockFullyDone = blockItems.length > 0 && blockItems.every(i => i.completed);
        block.completed = blockFullyDone;
        await dataService.updateScheduleBlock(block.id, { completed: blockFullyDone });
      }
    }

    set({
      syllabusItems: updatedSyllabusItems,
      modules: updatedModules,
      scheduleBlocks: updatedBlocks,
    });
  },

  toggleSubComponentCompletion: async (itemId, subComponent) => {
    const { syllabusItems, modules, scheduleBlocks, activeBackend } = get();
    const item = syllabusItems.find((i) => i.id === itemId);
    if (!item || item.type !== 'Class') return;

    const normalizedItem = normalizeSyllabusItem(item);
    const patch: Partial<SyllabusItem> = {};

    if (subComponent === 'video') {
      patch.videoCompleted = !normalizedItem.videoCompleted;
    } else if (subComponent === 'assignment') {
      patch.assignmentCompleted = !normalizedItem.assignmentCompleted;
    } else if (subComponent === 'additional') {
      patch.additionalProblemsCompleted = !normalizedItem.additionalProblemsCompleted;
    }

    const updatedItemState = { ...normalizedItem, ...patch };
    const autoCompleted = isClassItemFullyCompleted(updatedItemState);
    patch.completed = autoCompleted;

    const dataService = getDataService(activeBackend);
    await dataService.updateSyllabusItem(itemId, patch);

    const updatedSyllabusItems = syllabusItems.map((i) =>
      i.id === itemId ? { ...i, ...patch } : i
    );

    // Update module status
    const moduleItems = updatedSyllabusItems.filter((i) => i.moduleId === item.moduleId);
    const moduleCompletedCount = moduleItems.filter((i) => i.completed).length;
    const moduleStatus: 'not_started' | 'in_progress' | 'completed' =
      moduleCompletedCount === moduleItems.length
        ? 'completed'
        : moduleCompletedCount > 0
        ? 'in_progress'
        : 'not_started';

    await dataService.updateModule(item.moduleId, { status: moduleStatus });

    const updatedModules: Module[] = modules.map((m) =>
      m.id === item.moduleId ? { ...m, status: moduleStatus } : m
    );

    // Update schedule blocks referencing this item
    const updatedBlocks = [...scheduleBlocks];
    for (const block of updatedBlocks) {
      if (block.itemIds?.includes(itemId)) {
        const blockItems = updatedSyllabusItems.filter((i) => block.itemIds?.includes(i.id));
        const blockFullyDone = blockItems.length > 0 && blockItems.every((i) => i.completed);
        block.completed = blockFullyDone;
        await dataService.updateScheduleBlock(block.id, { completed: blockFullyDone });
      }
    }

    set({
      syllabusItems: updatedSyllabusItems,
      modules: updatedModules,
      scheduleBlocks: updatedBlocks,
    });
  },

  updateBlockLog: async (blockId, patch) => {
    const { scheduleBlocks, activeBackend } = get();
    const dataService = getDataService(activeBackend);
    await dataService.updateScheduleBlock(blockId, patch);

    const updatedBlocks = scheduleBlocks.map(b =>
      b.id === blockId ? { ...b, ...patch } : b
    );

    set({ scheduleBlocks: updatedBlocks });
  },

  updateModuleData: async (moduleId, patch) => {
    const { modules, activeBackend } = get();
    const dataService = getDataService(activeBackend);
    await dataService.updateModule(moduleId, patch);

    const updatedModules = modules.map(m =>
      m.id === moduleId ? { ...m, ...patch } : m
    );

    set({ modules: updatedModules });
  },

  updateSettingsData: async (patch) => {
    const { settings, activeBackend } = get();
    const dataService = getDataService(activeBackend);
    await dataService.updateSettings(patch);

    const updatedSettings = settings ? { ...settings, ...patch } : (patch as Settings);
    set({ settings: updatedSettings });
  },

  setCurrentDateStr: (dateIso) => {
    set({ currentDateStr: dateIso });
  },

  exportData: async () => {
    const { activeBackend } = get();
    const dataService = getDataService(activeBackend);
    const [modules, syllabusItems, scheduleBlocks, settings] = await Promise.all([
      dataService.getModules(),
      dataService.getSyllabusItems(),
      dataService.getScheduleBlocks(),
      dataService.getSettings(),
    ]);

    const backupData = {
      exportDate: new Date().toISOString(),
      modules,
      syllabusItems,
      scheduleBlocks,
      settings,
    };

    return JSON.stringify(backupData, null, 2);
  },

  importData: async (jsonString) => {
    const { activeBackend } = get();
    const parsed = JSON.parse(jsonString);
    if (!parsed.modules || !parsed.syllabusItems || !parsed.scheduleBlocks || !parsed.settings) {
      throw new Error('Invalid backup file format');
    }

    const dataService = getDataService(activeBackend);
    await dataService.resetData();

    for (const mod of parsed.modules) {
      await dataService.updateModule(mod.id, mod);
    }
    for (const item of parsed.syllabusItems) {
      await dataService.updateSyllabusItem(item.id, item);
    }
    for (const block of parsed.scheduleBlocks) {
      await dataService.updateScheduleBlock(block.id, block);
    }
    await dataService.updateSettings(parsed.settings);

    await get().loadData();
  },

  resetToSeed: async () => {
    const { activeBackend } = get();
    const dataService = getDataService(activeBackend);
    await dataService.resetData();
    await get().loadData();
  },

  getMetrics: () => {
    const { modules, syllabusItems, scheduleBlocks, settings, currentDateStr } = get();
    if (!settings || modules.length === 0) return null;
    return computeTrackerMetrics(modules, syllabusItems, scheduleBlocks, settings, currentDateStr);
  },
}));
