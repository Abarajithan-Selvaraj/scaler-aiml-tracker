import { openDB, IDBPDatabase } from 'idb';
import { DataService, Module, ScheduleBlock, SyllabusItem, Settings, SeedData } from '../types/tracker';
import rawSeedData from '../data/seed_data.json';
import { linkScheduleBlockItems } from '../utils/seedMigration';

const DB_NAME = 'scaler-tracker-db';
const DB_VERSION = 1;

export class IndexedDBDataService implements DataService {
  private dbPromise: Promise<IDBPDatabase> | null = null;
  private memoryStore: SeedData | null = null;

  private isIndexedDBAvailable(): boolean {
    return typeof indexedDB !== 'undefined';
  }

  private getDB(): Promise<IDBPDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('modules')) {
            db.createObjectStore('modules', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('syllabusItems')) {
            db.createObjectStore('syllabusItems', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('scheduleBlocks')) {
            db.createObjectStore('scheduleBlocks', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings', { keyPath: 'id' });
          }
        },
      });
    }
    return this.dbPromise;
  }

  async init(): Promise<void> {
    if (!this.isIndexedDBAvailable()) {
      if (!this.memoryStore) {
        const seed = rawSeedData as unknown as SeedData;
        const linkedBlocks = linkScheduleBlockItems(seed.scheduleBlocks, seed.syllabusItems);
        this.memoryStore = {
          modules: JSON.parse(JSON.stringify(seed.modules)),
          syllabusItems: JSON.parse(JSON.stringify(seed.syllabusItems)),
          scheduleBlocks: JSON.parse(JSON.stringify(linkedBlocks)),
          settings: JSON.parse(JSON.stringify(seed.settings)),
        };
      }
      return;
    }

    const db = await this.getDB();
    const count = await db.count('modules');
    if (count === 0) {
      await this.seedInitialData();
    } else {
      // Auto-migration: ensure existing database scheduleBlocks have linked itemIds
      const existingBlocks = (await db.getAll('scheduleBlocks')) as ScheduleBlock[];
      const needsLinking = existingBlocks.length > 0 && (!existingBlocks[0].itemIds || existingBlocks[0].itemIds.length === 0);
      if (needsLinking) {
        const existingItems = (await db.getAll('syllabusItems')) as SyllabusItem[];
        const reLinkedBlocks = linkScheduleBlockItems(existingBlocks, existingItems);
        const tx = db.transaction('scheduleBlocks', 'readwrite');
        for (const block of reLinkedBlocks) {
          await tx.store.put(block);
        }
        await tx.done;
      }
    }
  }

  private async seedInitialData(): Promise<void> {
    const db = await this.getDB();
    const seed = rawSeedData as unknown as SeedData;

    const linkedBlocks = linkScheduleBlockItems(seed.scheduleBlocks, seed.syllabusItems);
    const tx = db.transaction(['modules', 'syllabusItems', 'scheduleBlocks', 'settings'], 'readwrite');
    
    for (const mod of seed.modules) {
      tx.objectStore('modules').put(mod);
    }
    for (const item of seed.syllabusItems) {
      tx.objectStore('syllabusItems').put(item);
    }
    for (const block of linkedBlocks) {
      tx.objectStore('scheduleBlocks').put(block);
    }
    tx.objectStore('settings').put({ id: 'main', ...seed.settings });

    await tx.done;
  }

  async getModules(): Promise<Module[]> {
    if (!this.isIndexedDBAvailable()) {
      return (this.memoryStore?.modules || []).sort((a, b) => a.moduleNumber - b.moduleNumber);
    }
    const db = await this.getDB();
    const modules = await db.getAll('modules');
    return modules.sort((a, b) => a.moduleNumber - b.moduleNumber);
  }

  async getSyllabusItems(): Promise<SyllabusItem[]> {
    if (!this.isIndexedDBAvailable()) {
      return (this.memoryStore?.syllabusItems || []).sort((a, b) => a.sequence - b.sequence);
    }
    const db = await this.getDB();
    const items = await db.getAll('syllabusItems');
    return items.sort((a, b) => a.sequence - b.sequence);
  }

  async getScheduleBlocks(range?: { from: string; to: string }): Promise<ScheduleBlock[]> {
    if (!this.isIndexedDBAvailable()) {
      let blocks = this.memoryStore?.scheduleBlocks || [];
      if (range) {
        blocks = blocks.filter(b => b.date >= range.from && b.date <= range.to);
      }
      return blocks.sort((a, b) => a.id.localeCompare(b.id));
    }
    const db = await this.getDB();
    let blocks: ScheduleBlock[] = await db.getAll('scheduleBlocks');
    if (range) {
      blocks = blocks.filter(b => b.date >= range.from && b.date <= range.to);
    }
    return blocks.sort((a, b) => a.id.localeCompare(b.id));
  }

  async getSettings(): Promise<Settings> {
    if (!this.isIndexedDBAvailable()) {
      return this.memoryStore?.settings || (rawSeedData as unknown as SeedData).settings;
    }
    const db = await this.getDB();
    const settings = await db.get('settings', 'main');
    if (!settings) {
      const seed = rawSeedData as unknown as SeedData;
      return seed.settings;
    }
    const { id, ...rest } = settings;
    return rest as Settings;
  }

  async updateModule(id: string, patch: Partial<Module>): Promise<void> {
    if (!this.isIndexedDBAvailable()) {
      if (this.memoryStore) {
        this.memoryStore.modules = this.memoryStore.modules.map(m => m.id === id ? { ...m, ...patch } : m);
      }
      return;
    }
    const db = await this.getDB();
    const current = await db.get('modules', id);
    if (current) {
      await db.put('modules', { ...current, ...patch });
    }
  }

  async updateSyllabusItem(id: string, patch: Partial<SyllabusItem>): Promise<void> {
    if (!this.isIndexedDBAvailable()) {
      if (this.memoryStore) {
        this.memoryStore.syllabusItems = this.memoryStore.syllabusItems.map(i => i.id === id ? { ...i, ...patch } : i);
      }
      return;
    }
    const db = await this.getDB();
    const current = await db.get('syllabusItems', id);
    if (current) {
      await db.put('syllabusItems', { ...current, ...patch });
    }
  }

  async updateScheduleBlock(id: string, patch: Partial<ScheduleBlock>): Promise<void> {
    if (!this.isIndexedDBAvailable()) {
      if (this.memoryStore) {
        this.memoryStore.scheduleBlocks = this.memoryStore.scheduleBlocks.map(b => b.id === id ? { ...b, ...patch } : b);
      }
      return;
    }
    const db = await this.getDB();
    const current = await db.get('scheduleBlocks', id);
    if (current) {
      await db.put('scheduleBlocks', { ...current, ...patch });
    }
  }

  async updateScheduleBlocksBulk(blocks: ScheduleBlock[]): Promise<void> {
    if (!this.isIndexedDBAvailable()) {
      if (this.memoryStore) {
        this.memoryStore.scheduleBlocks = blocks;
      }
      return;
    }
    const db = await this.getDB();
    const tx = db.transaction('scheduleBlocks', 'readwrite');
    for (const b of blocks) {
      await tx.store.put(b);
    }
    await tx.done;
  }

  async updateSettings(patch: Partial<Settings>): Promise<void> {
    if (!this.isIndexedDBAvailable()) {
      if (this.memoryStore) {
        this.memoryStore.settings = { ...this.memoryStore.settings, ...patch };
      }
      return;
    }
    const db = await this.getDB();
    const current = await this.getSettings();
    await db.put('settings', { id: 'main', ...current, ...patch });
  }

  async exportAll(): Promise<string> {
    const modules = await this.getModules();
    const syllabusItems = await this.getSyllabusItems();
    const scheduleBlocks = await this.getScheduleBlocks();
    const settings = await this.getSettings();

    return JSON.stringify({ modules, syllabusItems, scheduleBlocks, settings }, null, 2);
  }

  async importAll(json: string): Promise<void> {
    const parsed = JSON.parse(json) as SeedData;
    if (!parsed.modules || !parsed.syllabusItems || !parsed.scheduleBlocks || !parsed.settings) {
      throw new Error('Invalid backup JSON file structure');
    }

    if (!this.isIndexedDBAvailable()) {
      this.memoryStore = JSON.parse(json);
      return;
    }

    const db = await this.getDB();
    const tx = db.transaction(['modules', 'syllabusItems', 'scheduleBlocks', 'settings'], 'readwrite');
    await tx.objectStore('modules').clear();
    await tx.objectStore('syllabusItems').clear();
    await tx.objectStore('scheduleBlocks').clear();
    await tx.objectStore('settings').clear();

    for (const mod of parsed.modules) {
      await tx.objectStore('modules').put(mod);
    }
    for (const item of parsed.syllabusItems) {
      await tx.objectStore('syllabusItems').put(item);
    }
    for (const block of parsed.scheduleBlocks) {
      await tx.objectStore('scheduleBlocks').put(block);
    }
    await tx.objectStore('settings').put({ id: 'main', ...parsed.settings });

    await tx.done;
  }

  async resetData(): Promise<void> {
    await this.resetToSeed();
  }

  async resetToSeed(): Promise<void> {
    if (!this.isIndexedDBAvailable()) {
      this.memoryStore = null;
      await this.init();
      return;
    }
    const db = await this.getDB();
    const tx = db.transaction(['modules', 'syllabusItems', 'scheduleBlocks', 'settings'], 'readwrite');
    await tx.objectStore('modules').clear();
    await tx.objectStore('syllabusItems').clear();
    await tx.objectStore('scheduleBlocks').clear();
    await tx.objectStore('settings').clear();
    await tx.done;

    await this.seedInitialData();
  }
}

export const indexedDbService = new IndexedDBDataService();
