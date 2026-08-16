import { 
  doc, getDoc, getDocs, collection, updateDoc, writeBatch, onSnapshot
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { DataService, Module, ScheduleBlock, SyllabusItem, Settings, SeedData } from '../types/tracker';
import rawSeedData from '../data/seed_data.json';
import { linkScheduleBlockItems } from '../utils/seedMigration';

export class FirestoreDataService implements DataService {
  private seedingPromise: Promise<void> | null = null;

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

    // Check if user has modules initialized
    const modulesSnap = await getDocs(collection(db, 'users', uid, 'modules'));
    if (modulesSnap.empty) {
      await this.seedInitialData(uid);
    }
  }

  private async commitInChunks(docsToSet: Array<{ ref: any; data: any }>): Promise<void> {
    const BATCH_SIZE = 400; // Safe threshold under Firestore 500 write limit
    for (let i = 0; i < docsToSet.length; i += BATCH_SIZE) {
      const chunk = docsToSet.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);
      for (const item of chunk) {
        batch.set(item.ref, item.data);
      }
      await batch.commit();
    }
  }

  private async seedInitialData(uid: string): Promise<void> {
    if (this.seedingPromise) {
      return this.seedingPromise;
    }

    this.seedingPromise = (async () => {
      const seed = rawSeedData as unknown as SeedData;
      const linkedBlocks = linkScheduleBlockItems(seed.scheduleBlocks, seed.syllabusItems);

      const docsToSet: Array<{ ref: any; data: any }> = [];

      for (const mod of seed.modules) {
        docsToSet.push({ ref: doc(db, 'users', uid, 'modules', mod.id), data: mod });
      }
      for (const item of seed.syllabusItems) {
        docsToSet.push({ ref: doc(db, 'users', uid, 'syllabusItems', item.id), data: item });
      }
      for (const block of linkedBlocks) {
        docsToSet.push({ ref: doc(db, 'users', uid, 'scheduleBlocks', block.id), data: block });
      }
      docsToSet.push({ ref: doc(db, 'users', uid, 'settings', 'main'), data: seed.settings });

      await this.commitInChunks(docsToSet);
    })().finally(() => {
      this.seedingPromise = null;
    });

    return this.seedingPromise;
  }

  async uploadLocalData(data: {
    modules: Module[];
    syllabusItems: SyllabusItem[];
    scheduleBlocks: ScheduleBlock[];
    settings: Settings;
  }): Promise<void> {
    const uid = this.getUserUid();
    const docsToSet: Array<{ ref: any; data: any }> = [];

    for (const mod of data.modules) {
      docsToSet.push({ ref: doc(db, 'users', uid, 'modules', mod.id), data: mod });
    }
    for (const item of data.syllabusItems) {
      docsToSet.push({ ref: doc(db, 'users', uid, 'syllabusItems', item.id), data: item });
    }
    for (const block of data.scheduleBlocks) {
      docsToSet.push({ ref: doc(db, 'users', uid, 'scheduleBlocks', block.id), data: block });
    }
    docsToSet.push({ ref: doc(db, 'users', uid, 'settings', 'main'), data: data.settings });

    await this.commitInChunks(docsToSet);
  }

  async importAll(json: string): Promise<void> {
    const parsed = JSON.parse(json) as SeedData;
    if (!parsed.modules || !parsed.syllabusItems || !parsed.scheduleBlocks || !parsed.settings) {
      throw new Error('Invalid backup JSON file structure');
    }

    await this.uploadLocalData({
      modules: parsed.modules,
      syllabusItems: parsed.syllabusItems,
      scheduleBlocks: parsed.scheduleBlocks,
      settings: parsed.settings,
    });
  }

  async getModules(): Promise<Module[]> {
    const uid = this.getUserUid();
    let snap = await getDocs(collection(db, 'users', uid, 'modules'));
    if (snap.empty) {
      await this.seedInitialData(uid);
      snap = await getDocs(collection(db, 'users', uid, 'modules'));
    }
    const modules: Module[] = [];
    snap.forEach(d => modules.push(d.data() as Module));
    return modules.sort((a, b) => a.moduleNumber - b.moduleNumber);
  }

  async getSyllabusItems(): Promise<SyllabusItem[]> {
    const uid = this.getUserUid();
    let snap = await getDocs(collection(db, 'users', uid, 'syllabusItems'));
    if (snap.empty) {
      await this.seedInitialData(uid);
      snap = await getDocs(collection(db, 'users', uid, 'syllabusItems'));
    }
    const items: SyllabusItem[] = [];
    snap.forEach(d => items.push(d.data() as SyllabusItem));
    return items.sort((a, b) => a.sequence - b.sequence);
  }

  async getScheduleBlocks(range?: { from: string; to: string }): Promise<ScheduleBlock[]> {
    const uid = this.getUserUid();
    let snap = await getDocs(collection(db, 'users', uid, 'scheduleBlocks'));
    if (snap.empty) {
      await this.seedInitialData(uid);
      snap = await getDocs(collection(db, 'users', uid, 'scheduleBlocks'));
    }
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

  async resetData(): Promise<void> {
    const uid = this.getUserUid();
    const seed = rawSeedData as unknown as SeedData;
    const linkedBlocks = linkScheduleBlockItems(seed.scheduleBlocks, seed.syllabusItems);

    const docsToSet: Array<{ ref: any; data: any }> = [];

    for (const mod of seed.modules) {
      docsToSet.push({ ref: doc(db, 'users', uid, 'modules', mod.id), data: mod });
    }
    for (const item of seed.syllabusItems) {
      docsToSet.push({ ref: doc(db, 'users', uid, 'syllabusItems', item.id), data: item });
    }
    for (const block of linkedBlocks) {
      docsToSet.push({ ref: doc(db, 'users', uid, 'scheduleBlocks', block.id), data: block });
    }
    docsToSet.push({ ref: doc(db, 'users', uid, 'settings', 'main'), data: seed.settings });

    await this.commitInChunks(docsToSet);
  }

  subscribeToRealtime(
    onData: (data: {
      modules: Module[];
      syllabusItems: SyllabusItem[];
      scheduleBlocks: ScheduleBlock[];
      settings: Settings;
    }) => void,
    onError?: (err: Error) => void
  ): () => void {
    const uid = auth.currentUser?.uid;
    if (!uid) return () => {};

    let modules: Module[] = [];
    let syllabusItems: SyllabusItem[] = [];
    let scheduleBlocks: ScheduleBlock[] = [];
    let settings: Settings | null = null;

    let hasModules = false;
    let hasSyllabus = false;
    let hasBlocks = false;
    let hasSettings = false;

    const checkAndEmit = () => {
      if (hasModules && hasSyllabus && hasBlocks && hasSettings && settings) {
        onData({
          modules: [...modules].sort((a, b) => a.moduleNumber - b.moduleNumber),
          syllabusItems: [...syllabusItems].sort((a, b) => a.sequence - b.sequence),
          scheduleBlocks: [...scheduleBlocks].sort((a, b) => a.id.localeCompare(b.id)),
          settings,
        });
      }
    };

    const unsubModules = onSnapshot(
      collection(db, 'users', uid, 'modules'),
      (snap) => {
        const list: Module[] = [];
        snap.forEach((d) => list.push(d.data() as Module));
        modules = list;
        hasModules = true;
        checkAndEmit();
      },
      (err) => onError?.(err)
    );

    const unsubSyllabus = onSnapshot(
      collection(db, 'users', uid, 'syllabusItems'),
      (snap) => {
        const list: SyllabusItem[] = [];
        snap.forEach((d) => list.push(d.data() as SyllabusItem));
        syllabusItems = list;
        hasSyllabus = true;
        checkAndEmit();
      },
      (err) => onError?.(err)
    );

    const unsubBlocks = onSnapshot(
      collection(db, 'users', uid, 'scheduleBlocks'),
      (snap) => {
        const list: ScheduleBlock[] = [];
        snap.forEach((d) => list.push(d.data() as ScheduleBlock));
        scheduleBlocks = list;
        hasBlocks = true;
        checkAndEmit();
      },
      (err) => onError?.(err)
    );

    const unsubSettings = onSnapshot(
      doc(db, 'users', uid, 'settings', 'main'),
      (snap) => {
        if (snap.exists()) {
          settings = snap.data() as Settings;
        }
        hasSettings = true;
        checkAndEmit();
      },
      (err) => onError?.(err)
    );

    return () => {
      unsubModules();
      unsubSyllabus();
      unsubBlocks();
      unsubSettings();
    };
  }
}


export const firestoreService = new FirestoreDataService();
