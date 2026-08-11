import { create } from 'zustand';
import { Module, ScheduleBlock, Settings, SyllabusItem } from '../types/tracker';
import { getDataService } from '../services/dataService';
import { computeTrackerMetrics, TrackerMetrics } from '../utils/calculations';

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

    // Auto update Module status
    const moduleId = item.moduleId;
    let updatedModules = [...modules];

    if (moduleId && !moduleId.startsWith('C')) {
      const moduleItems = updatedSyllabusItems.filter(i => i.moduleId === moduleId);
      const completedCount = moduleItems.filter(i => i.completed).length;
      let newStatus: Module['status'] = 'not_started';

      if (completedCount === moduleItems.length && moduleItems.length > 0) {
        newStatus = 'completed';
      } else if (completedCount > 0) {
        newStatus = 'in_progress';
      }

      await dataService.updateModule(moduleId, { status: newStatus });
      updatedModules = updatedModules.map(m =>
        m.id === moduleId ? { ...m, status: newStatus } : m
      );
    }

    // Check schedule blocks containing this item
    const updatedBlocks = scheduleBlocks.map(block => {
      if (block.itemIds && block.itemIds.includes(itemId)) {
        const allBlockItemsDone = block.itemIds.every(id => {
          if (id === itemId) return newCompleted;
          const found = updatedSyllabusItems.find(x => x.id === id);
          return found ? found.completed : false;
        });
        if (block.completed !== allBlockItemsDone) {
          dataService.updateScheduleBlock(block.id, { completed: allBlockItemsDone });
          return { ...block, completed: allBlockItemsDone };
        }
      }
      return block;
    });

    set({
      syllabusItems: updatedSyllabusItems,
      modules: updatedModules,
      scheduleBlocks: updatedBlocks,
    });
  },

  toggleSubComponentCompletion: async (itemId, subComponent) => {
    const { syllabusItems, modules, scheduleBlocks, activeBackend } = get();
    const targetItem = syllabusItems.find(i => i.id === itemId);
    if (!targetItem || targetItem.type !== 'Class') return;

    const normalized = normalizeSyllabusItem(targetItem);
    const patch: Partial<SyllabusItem> = {};

    if (subComponent === 'video') {
      patch.videoCompleted = !normalized.videoCompleted;
    } else if (subComponent === 'assignment') {
      patch.assignmentCompleted = !normalized.assignmentCompleted;
    } else if (subComponent === 'additional') {
      patch.additionalProblemsCompleted = !normalized.additionalProblemsCompleted;
    }

    const updatedTemp = { ...normalized, ...patch };
    patch.completed = isClassItemFullyCompleted(updatedTemp);

    const dataService = getDataService(activeBackend);
    await dataService.updateSyllabusItem(itemId, patch);

    const updatedSyllabusItems = syllabusItems.map(i =>
      i.id === itemId ? { ...i, ...patch } : i
    );

    // Auto update Module status
    const moduleId = targetItem.moduleId;
    let updatedModules = [...modules];

    if (moduleId && !moduleId.startsWith('C')) {
      const moduleItems = updatedSyllabusItems.filter(i => i.moduleId === moduleId);
      const completedCount = moduleItems.filter(i => i.completed).length;
      let newStatus: Module['status'] = 'not_started';

      if (completedCount === moduleItems.length && moduleItems.length > 0) {
        newStatus = 'completed';
      } else if (completedCount > 0) {
        newStatus = 'in_progress';
      }

      await dataService.updateModule(moduleId, { status: newStatus });
      updatedModules = updatedModules.map(m =>
        m.id === moduleId ? { ...m, status: newStatus } : m
      );
    }

    // Check schedule blocks containing this item
    const updatedBlocks = scheduleBlocks.map(block => {
      if (block.itemIds && block.itemIds.includes(itemId)) {
        const allBlockItemsDone = block.itemIds.every(id => {
          const found = updatedSyllabusItems.find(x => x.id === id);
          return found ? found.completed : false;
        });
        if (block.completed !== allBlockItemsDone) {
          dataService.updateScheduleBlock(block.id, { completed: allBlockItemsDone });
          return { ...block, completed: allBlockItemsDone };
        }
      }
      return block;
    });

    set({
      syllabusItems: updatedSyllabusItems,
      modules: updatedModules,
      scheduleBlocks: updatedBlocks,
    });
  },

  updateBlockLog: async (blockId, patch) => {
    const { scheduleBlocks, activeBackend } = get();
    const targetBlock = scheduleBlocks.find(b => b.id === blockId);
    if (!targetBlock) return;

    const updatedBlock = { ...targetBlock, ...patch };
    const dataService = getDataService(activeBackend);
    await dataService.updateScheduleBlock(blockId, patch);

    set({
      scheduleBlocks: scheduleBlocks.map(b => (b.id === blockId ? updatedBlock : b)),
    });
  },

  updateModuleData: async (moduleId, patch) => {
    const { modules, activeBackend } = get();
    const dataService = getDataService(activeBackend);
    await dataService.updateModule(moduleId, patch);

    set({
      modules: modules.map(m => (m.id === moduleId ? { ...m, ...patch } : m)),
    });
  },

  updateSettingsData: async (patch) => {
    const { settings, activeBackend } = get();
    if (!settings) return;

    const dataService = getDataService(activeBackend);
    await dataService.updateSettings(patch);

    set({
      settings: { ...settings, ...patch },
      ...(patch.simulatedDate ? { currentDateStr: patch.simulatedDate } : {}),
    });
  },

  setCurrentDateStr: (dateIso) => {
    set({ currentDateStr: dateIso });
  },

  exportData: async () => {
    const dataService = getDataService(get().activeBackend);
    return await dataService.exportAll();
  },

  importData: async (json) => {
    set({ isSyncing: true, error: null });
    try {
      const dataService = getDataService(get().activeBackend);
      await dataService.importAll(json);
      await get().loadData();
    } catch (err: any) {
      set({ error: err?.message || 'Failed to import backup data' });
    } finally {
      set({ isSyncing: false });
    }
  },

  resetToSeed: async () => {
    set({ isSyncing: true, error: null });
    try {
      const dataService = getDataService(get().activeBackend);
      await dataService.resetToSeed();
      await get().loadData();
    } catch (err: any) {
      set({ error: err?.message || 'Failed to reset data to seed' });
    } finally {
      set({ isSyncing: false });
    }
  },

  getMetrics: () => {
    const { modules, syllabusItems, scheduleBlocks, settings, currentDateStr } = get();
    if (!settings || modules.length === 0) return null;
    return computeTrackerMetrics(modules, syllabusItems, scheduleBlocks, settings, currentDateStr);
  },
}));
