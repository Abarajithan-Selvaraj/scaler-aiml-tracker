import { 
  doc, setDoc, getDoc, getDocs, collection, updateDoc, writeBatch, deleteDoc 
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { DataService, Module, ScheduleBlock, SyllabusItem, Settings, SeedData } from '../types/tracker';
import rawSeedData from '../data/seed_data.json';
import { linkScheduleBlockItems } from '../utils/seedMigration';

export class FirestoreDataService implements DataService {
  private getUserUid(): string {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      throw new Error('User must be signed in to access Firestore data.');
    }
    return uid;
  }

  async init(): Promise<void> {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    // Check if user has settings document initialized
    const settingsRef = doc(db, 'users', uid, 'settings', 'main');
    const snap = await getDoc(settingsRef);
    if (!snap.exists()) {
      await this.seedInitialData(uid);
    }
  }

  private async seedInitialData(uid: string): Promise<void> {
    const seed = rawSeedData as unknown as SeedData;
    const linkedBlocks = linkScheduleBlockItems(seed.scheduleBlocks, seed.syllabusItems);

    const batch = writeBatch(db);

    for (const mod of seed.modules) {
      batch.set(doc(db, 'users', uid, 'modules', mod.id), mod);
    }
    for (const item of seed.syllabusItems) {
      batch.set(doc(db, 'users', uid, 'syllabusItems', item.id), item);
    }
    for (const block of linkedBlocks) {
      batch.set(doc(db, 'users', uid, 'scheduleBlocks', block.id), block);
    }
    batch.set(doc(db, 'users', uid, 'settings', 'main'), seed.settings);

    await batch.commit();
  }

  async getModules(): Promise<Module[]> {
    const uid = this.getUserUid();
    const snap = await getDocs(collection(db, 'users', uid, 'modules'));
    const modules: Module[] = [];
    snap.forEach(d => modules.push(d.data() as Module));
    return modules.sort((a, b) => a.moduleNumber - b.moduleNumber);
  }

  async getSyllabusItems(): Promise<SyllabusItem[]> {
    const uid = this.getUserUid();
    const snap = await getDocs(collection(db, 'users', uid, 'syllabusItems'));
    const items: SyllabusItem[] = [];
    snap.forEach(d => items.push(d.data() as SyllabusItem));
    return items.sort((a, b) => a.sequence - b.sequence);
  }

  async getScheduleBlocks(range?: { from: string; to: string }): Promise<ScheduleBlock[]> {
    const uid = this.getUserUid();
    const snap = await getDocs(collection(db, 'users', uid, 'scheduleBlocks'));
    let blocks: ScheduleBlock[] = [];
    snap.forEach(d => blocks.push(d.data() as ScheduleBlock));
    if (range) {
      blocks = blocks.filter(b => b.date >= range.from && b.date <= range.to);
    }
    return blocks.sort((a, b) => a.id.localeCompare(b.id));
  }

  async getSettings(): Promise<Settings> {
    const uid = this.getUserUid();
    const snap = await getDoc(doc(db, 'users', uid, 'settings', 'main'));
    if (!snap.exists()) {
      const seed = rawSeedData as unknown as SeedData;
      return seed.settings;
    }
    return snap.data() as Settings;
  }

  async updateModule(id: string, patch: Partial<Module>): Promise<void> {
    const uid = this.getUserUid();
    await updateDoc(doc(db, 'users', uid, 'modules', id), patch);
  }

  async updateSyllabusItem(id: string, patch: Partial<SyllabusItem>): Promise<void> {
    const uid = this.getUserUid();
    await updateDoc(doc(db, 'users', uid, 'syllabusItems', id), patch);
  }

  async updateScheduleBlock(id: string, patch: Partial<ScheduleBlock>): Promise<void> {
    const uid = this.getUserUid();
    await updateDoc(doc(db, 'users', uid, 'scheduleBlocks', id), patch);
  }

  async updateSettings(patch: Partial<Settings>): Promise<void> {
    const uid = this.getUserUid();
    await updateDoc(doc(db, 'users', uid, 'settings', 'main'), patch);
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
    const uid = this.getUserUid();

    const batch = writeBatch(db);
    for (const mod of parsed.modules) {
      batch.set(doc(db, 'users', uid, 'modules', mod.id), mod);
    }
    for (const item of parsed.syllabusItems) {
      batch.set(doc(db, 'users', uid, 'syllabusItems', item.id), item);
    }
    for (const block of parsed.scheduleBlocks) {
      batch.set(doc(db, 'users', uid, 'scheduleBlocks', block.id), block);
    }
    batch.set(doc(db, 'users', uid, 'settings', 'main'), parsed.settings);

    await batch.commit();
  }

  async resetToSeed(): Promise<void> {
    const uid = this.getUserUid();
    await this.seedInitialData(uid);
  }
}

export const firestoreService = new FirestoreDataService();
