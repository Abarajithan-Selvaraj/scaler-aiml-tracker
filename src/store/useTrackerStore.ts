import { create } from 'zustand';
import { Module, ScheduleBlock, Settings, SyllabusItem } from '../types/tracker';
import { getDataService } from '../services/dataService';
import { computeTrackerMetrics, TrackerMetrics } from '../utils/calculations';
import { auth, isFirebaseConfigured } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { firestoreService } from '../services/firestoreService';
import { indexedDbService } from '../services/indexedDbService';
import { linkScheduleBlockItems, cleanFocusTitle } from '../utils/seedMigration';

/**
 * Robustly matches a ScheduleBlock to a SyllabusItem either by explicit itemIds or fuzzy title matching.
 */
export function blockMatchesSyllabusItem(block: ScheduleBlock, item: SyllabusItem): boolean {
  if (block.itemIds?.includes(item.id)) return true;
  if (block.focusItems && block.focusItems.length > 0 && item.title) {
    const itemTitleClean = item.title.toLowerCase().trim();
    return block.focusItems.some((f) => {
      const cleaned = cleanFocusTitle(f).toLowerCase().trim();
      return cleaned.length > 3 && (itemTitleClean.includes(cleaned) || cleaned.includes(itemTitleClean));
    });
  }
  return false;
}

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
  reassignScheduleBlockDate: (blockId: string, newDateIso: string) => Promise<void>;
  reorderSyllabusItems: (sourceItemId: string, targetItemId: string) => Promise<void>;
  moveSyllabusItem: (itemId: string, direction: 'up' | 'down') => Promise<void>;
  getMetrics: () => TrackerMetrics | null;
}

let realtimeUnsubscribe: (() => void) | null = null;

const getInitialEffectiveDate = (settings: Settings | null): string => {
  if (settings?.simulatedDate) {
    return settings.simulatedDate;
  }
  const todayIso = new Date().toISOString().split('T')[0];
  const courseStart = settings?.courseStartDate || '2026-08-01';
  return todayIso < courseStart ? courseStart : todayIso;
};

const mirrorToIndexedDB = (data: {
  modules?: Module[];
  syllabusItems?: SyllabusItem[];
  scheduleBlocks?: ScheduleBlock[];
  settings?: Settings | null;
}) => {
  indexedDbService.init().then(async () => {
    if (data.modules) {
      for (const m of data.modules) await indexedDbService.updateModule(m.id, m);
    }
    if (data.syllabusItems) {
      for (const s of data.syllabusItems) await indexedDbService.updateSyllabusItem(s.id, s);
    }
    if (data.scheduleBlocks) {
      if (indexedDbService.updateScheduleBlocksBulk) {
        await indexedDbService.updateScheduleBlocksBulk(data.scheduleBlocks);
      } else {
        for (const b of data.scheduleBlocks) await indexedDbService.updateScheduleBlock(b.id, b);
      }
    }
    if (data.settings) {
      await indexedDbService.updateSettings(data.settings);
    }
  }).catch((err) => {
    console.warn('Failed to mirror Firestore data to IndexedDB:', err);
  });
};

const setupRealtimeSubscription = (set: any, get: any) => {
  if (realtimeUnsubscribe) {
    realtimeUnsubscribe();
    realtimeUnsubscribe = null;
  }

  const { activeBackend } = get();
  if (activeBackend !== 'firestore') return;

  realtimeUnsubscribe = firestoreService.subscribeToRealtime(
    (data) => {
      if (data.modules.length === 0 || data.scheduleBlocks.length === 0) return;
      const syllabusItems = data.syllabusItems.map(normalizeSyllabusItem);
      const currentSelectedDate = get().currentDateStr;
      const effectiveDate = currentSelectedDate || getInitialEffectiveDate(data.settings);

      set({
        modules: data.modules,
        syllabusItems,
        scheduleBlocks: data.scheduleBlocks,
        settings: data.settings,
        currentDateStr: effectiveDate,
        isLoading: false,
      });

      mirrorToIndexedDB({
        modules: data.modules,
        syllabusItems,
        scheduleBlocks: data.scheduleBlocks,
        settings: data.settings,
      });
    },
    (err) => {
      console.warn('Realtime subscription error:', err);
    }
  );
};

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

    let authResolved = false;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const nextBackend = user ? 'firestore' : 'indexeddb';

      if (!authResolved) {
        authResolved = true;
        set({ activeBackend: nextBackend });
        await get().loadData();
      } else {
        const prevBackend = get().activeBackend;
        if (nextBackend !== prevBackend) {
          set({ activeBackend: nextBackend });
          await get().loadData();
        }
      }
    });

    return () => {
      unsubscribe();
      if (realtimeUnsubscribe) {
        realtimeUnsubscribe();
        realtimeUnsubscribe = null;
      }
    };
  },

  syncLocalToCloud: async () => {
    if (!auth?.currentUser || !isFirebaseConfigured()) return;
    set({ isSyncing: true });
    try {
      // Read local IndexedDB data
      await indexedDbService.init();
      const [modules, rawItems, rawBlocks, settings] = await Promise.all([
        indexedDbService.getModules(),
        indexedDbService.getSyllabusItems(),
        indexedDbService.getScheduleBlocks(),
        indexedDbService.getSettings(),
      ]);

      const syllabusItems = rawItems.map(normalizeSyllabusItem);
      const scheduleBlocks = linkScheduleBlockItems(rawBlocks, syllabusItems);

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

      const fetchWithTimeout = <T>(promise: Promise<T>, timeoutMs = 5000): Promise<T> => {
        return new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            reject(new Error(`Backend operation timed out after ${timeoutMs}ms`));
          }, timeoutMs);

          promise
            .then((res) => {
              clearTimeout(timer);
              resolve(res);
            })
            .catch((err) => {
              clearTimeout(timer);
              reject(err);
            });
        });
      };

      const [modules, rawSyllabusItems, rawScheduleBlocks, settings] = await fetchWithTimeout(
        Promise.all([
          dataService.getModules(),
          dataService.getSyllabusItems(),
          dataService.getScheduleBlocks(),
          dataService.getSettings(),
        ]),
        5000
      );

      if (modules.length === 0 || rawScheduleBlocks.length === 0) {
        throw new Error('Retrieved empty dataset from cloud. Triggering local fallback.');
      }

      const syllabusItems = rawSyllabusItems.map(normalizeSyllabusItem);
      const scheduleBlocks = linkScheduleBlockItems(rawScheduleBlocks, syllabusItems);
      const currentSelectedDate = get().currentDateStr;
      const effectiveDate = currentSelectedDate || getInitialEffectiveDate(settings);

      set({
        modules,
        syllabusItems,
        scheduleBlocks,
        settings,
        currentDateStr: effectiveDate,
        isLoading: false,
      });
      if (get().activeBackend === 'firestore') {
        mirrorToIndexedDB({ modules, syllabusItems, scheduleBlocks, settings });
      }
      setupRealtimeSubscription(set, get);
    } catch (err: any) {
      console.warn('Failed to load data from active backend, falling back to IndexedDB:', err);
      try {
        await indexedDbService.init();
        const [modules, rawSyllabusItems, rawScheduleBlocks, settings] = await Promise.all([
          indexedDbService.getModules(),
          indexedDbService.getSyllabusItems(),
          indexedDbService.getScheduleBlocks(),
          indexedDbService.getSettings(),
        ]);

        const syllabusItems = rawSyllabusItems.map(normalizeSyllabusItem);
        const scheduleBlocks = linkScheduleBlockItems(rawScheduleBlocks, syllabusItems);
        const currentSelectedDate = get().currentDateStr;
        const effectiveDate = currentSelectedDate || getInitialEffectiveDate(settings);

        set({
          modules,
          syllabusItems,
          scheduleBlocks,
          settings,
          currentDateStr: effectiveDate,
          activeBackend: 'indexeddb',
          isLoading: false,
          error: null,
        });
        setupRealtimeSubscription(set, get);
      } catch (fallbackErr: any) {
        set({ error: fallbackErr?.message || 'Failed to load tracker data', isLoading: false });
      }
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

    // Update schedule blocks referencing this item (via itemIds or focusItems title match)
    const updatedBlocks = [...scheduleBlocks];
    for (const block of updatedBlocks) {
      if (blockMatchesSyllabusItem(block, item)) {
        if (!newCompleted) {
          block.completed = false;
          await dataService.updateScheduleBlock(block.id, { completed: false });
        } else {
          const blockItems = updatedSyllabusItems.filter((i) => blockMatchesSyllabusItem(block, i));
          const blockFullyDone = blockItems.length > 0 && blockItems.every((i) => i.completed);
          if (block.completed !== blockFullyDone) {
            block.completed = blockFullyDone;
            await dataService.updateScheduleBlock(block.id, { completed: blockFullyDone });
          }
        }
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
      if (blockMatchesSyllabusItem(block, item)) {
        if (!autoCompleted) {
          block.completed = false;
          await dataService.updateScheduleBlock(block.id, { completed: false });
        } else {
          const blockItems = updatedSyllabusItems.filter((i) => blockMatchesSyllabusItem(block, i));
          const blockFullyDone = blockItems.length > 0 && blockItems.every((i) => i.completed);
          if (block.completed !== blockFullyDone) {
            block.completed = blockFullyDone;
            await dataService.updateScheduleBlock(block.id, { completed: blockFullyDone });
          }
        }
      }
    }

    set({
      syllabusItems: updatedSyllabusItems,
      modules: updatedModules,
      scheduleBlocks: updatedBlocks,
    });
  },

  updateBlockLog: async (blockId, patch) => {
    const { scheduleBlocks, syllabusItems, modules, activeBackend } = get();
    const dataService = getDataService(activeBackend);
    await dataService.updateScheduleBlock(blockId, patch);

    const updatedBlocks = scheduleBlocks.map((b) =>
      b.id === blockId ? { ...b, ...patch } : b
    );

    const targetBlock = updatedBlocks.find((b) => b.id === blockId);
    let updatedSyllabusItems = [...syllabusItems];
    let updatedModules = [...modules];

    if (targetBlock && patch.completed !== undefined) {
      // Find all syllabus items matching this targetBlock (via itemIds or focusItems title matching)
      const matchingItems = updatedSyllabusItems.filter((i) => blockMatchesSyllabusItem(targetBlock, i));

      for (const item of matchingItems) {
        const itemBlocks = updatedBlocks.filter((b) => blockMatchesSyllabusItem(b, item));
        const allBlocksDone = itemBlocks.length > 0 && itemBlocks.every((b) => b.completed);

        const itemPatch: Partial<SyllabusItem> = { completed: allBlocksDone };
        if (item.type === 'Class') {
          if (allBlocksDone) {
            itemPatch.videoCompleted = true;
            itemPatch.assignmentCompleted = true;
            itemPatch.additionalProblemsCompleted = true;
          } else if (patch.completed === false) {
            // When a block is unchecked, mark the syllabus master item incomplete as well
            itemPatch.completed = false;
          }
        }

        await dataService.updateSyllabusItem(item.id, itemPatch);

        updatedSyllabusItems = updatedSyllabusItems.map((i) =>
          i.id === item.id ? { ...i, ...itemPatch } : i
        );

        // Update parent module status
        const moduleItems = updatedSyllabusItems.filter((i) => i.moduleId === item.moduleId);
        const moduleCompletedCount = moduleItems.filter((i) => i.completed).length;
        const moduleStatus: 'not_started' | 'in_progress' | 'completed' =
          moduleCompletedCount === moduleItems.length
            ? 'completed'
            : moduleCompletedCount > 0
            ? 'in_progress'
            : 'not_started';

        await dataService.updateModule(item.moduleId, { status: moduleStatus });

        updatedModules = updatedModules.map((m) =>
          m.id === item.moduleId ? { ...m, status: moduleStatus } : m
        );
      }
    }

    set({ scheduleBlocks: updatedBlocks, syllabusItems: updatedSyllabusItems, modules: updatedModules });
  },

  reassignScheduleBlockDate: async (blockId, newDateIso) => {
    const { scheduleBlocks, activeBackend } = get();
    const dataService = getDataService(activeBackend);
    await dataService.updateScheduleBlock(blockId, { date: newDateIso });

    const updatedBlocks = scheduleBlocks.map(b =>
      b.id === blockId ? { ...b, date: newDateIso } : b
    );

    set({ scheduleBlocks: updatedBlocks });
  },

  reorderSyllabusItems: async (sourceItemId: string, targetItemId: string) => {
    const { syllabusItems, activeBackend } = get();
    const sourceIdx = syllabusItems.findIndex(i => i.id === sourceItemId);
    const targetIdx = syllabusItems.findIndex(i => i.id === targetItemId);

    if (sourceIdx === -1 || targetIdx === -1 || sourceIdx === targetIdx) return;

    const reordered = [...syllabusItems];
    const [movedItem] = reordered.splice(sourceIdx, 1);
    reordered.splice(targetIdx, 0, movedItem);

    const updatedSyllabusItems = reordered.map((item, idx) => ({
      ...item,
      sequence: idx + 1,
    }));

    set({ syllabusItems: updatedSyllabusItems });

    const dataService = getDataService(activeBackend);
    const sourceUpdated = updatedSyllabusItems.find(i => i.id === sourceItemId);
    const targetUpdated = updatedSyllabusItems.find(i => i.id === targetItemId);

    if (sourceUpdated) await dataService.updateSyllabusItem(sourceItemId, { sequence: sourceUpdated.sequence });
    if (targetUpdated) await dataService.updateSyllabusItem(targetItemId, { sequence: targetUpdated.sequence });
  },

  moveSyllabusItem: async (itemId: string, direction: 'up' | 'down') => {
    const { syllabusItems } = get();
    const idx = syllabusItems.findIndex(i => i.id === itemId);
    if (idx === -1) return;

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= syllabusItems.length) return;

    const targetItemId = syllabusItems[targetIdx].id;
    await get().reorderSyllabusItems(itemId, targetItemId);
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
    const { settings, scheduleBlocks, activeBackend } = get();
    const dataService = getDataService(activeBackend);

    const baseBlockDate =
      scheduleBlocks.find((b) => Boolean(b.date))?.date || settings?.courseStartDate || '2026-08-01';
    const newStartDate = patch.courseStartDate;

    let updatedBlocks = [...scheduleBlocks];
    let newCurrentDateStr = get().currentDateStr;

    if (baseBlockDate && newStartDate && baseBlockDate !== newStartDate) {
      const [oldY, oldM, oldD] = baseBlockDate.split('-').map(Number);
      const [newY, newM, newD] = newStartDate.split('-').map(Number);
      const oldUtc = Date.UTC(oldY, oldM - 1, oldD);
      const newUtc = Date.UTC(newY, newM - 1, newD);
      const diffDays = Math.round((newUtc - oldUtc) / (1000 * 3600 * 24));

      if (diffDays !== 0) {
        updatedBlocks = scheduleBlocks.map((block) => {
          if (!block.date) return block;
          const [y, m, d] = block.date.split('-').map(Number);
          const dateObj = new Date(Date.UTC(y, m - 1, d));
          dateObj.setUTCDate(dateObj.getUTCDate() + diffDays);
          const shiftedDate = dateObj.toISOString().split('T')[0];
          return { ...block, date: shiftedDate };
        });
        newCurrentDateStr = newStartDate;

        if (dataService.updateScheduleBlocksBulk) {
          await dataService.updateScheduleBlocksBulk(updatedBlocks);
        } else {
          await Promise.all(
            updatedBlocks.map((b) => dataService.updateScheduleBlock(b.id, { date: b.date }))
          );
        }
      }
    }

    await dataService.updateSettings(patch);

    const updatedSettings = settings ? { ...settings, ...patch } : (patch as Settings);
    set({
      settings: updatedSettings,
      scheduleBlocks: updatedBlocks,
      currentDateStr: newCurrentDateStr,
    });
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
    if (dataService.importAll) {
      await dataService.importAll(jsonString);
    } else {
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
    }

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
