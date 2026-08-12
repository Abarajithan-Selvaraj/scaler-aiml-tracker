import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isFirebaseConfigured } from '../services/firebase';
import { getDataService } from '../services/dataService';
import { indexedDbService } from '../services/indexedDbService';
import { firestoreService } from '../services/firestoreService';

describe('Firebase Configuration & DataService Fallback Tests', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('should return false for isFirebaseConfigured when API Key is missing or undefined', () => {
    vi.stubEnv('VITE_FIREBASE_API_KEY', '');
    expect(isFirebaseConfigured()).toBe(false);

    vi.stubEnv('VITE_FIREBASE_API_KEY', 'undefined');
    expect(isFirebaseConfigured()).toBe(false);
  });

  it('should return false for isFirebaseConfigured when API Key is placeholder', () => {
    vi.stubEnv('VITE_FIREBASE_API_KEY', 'demo-api-key');
    expect(isFirebaseConfigured()).toBe(false);

    vi.stubEnv('VITE_FIREBASE_API_KEY', 'YOUR_FIREBASE_API_KEY');
    expect(isFirebaseConfigured()).toBe(false);

    vi.stubEnv('VITE_FIREBASE_API_KEY', 'short');
    expect(isFirebaseConfigured()).toBe(false);
  });

  it('should return true for isFirebaseConfigured when valid API Key is provided', () => {
    vi.stubEnv('VITE_FIREBASE_API_KEY', 'AIzaSyD1234567890abcdefghijklm');
    expect(isFirebaseConfigured()).toBe(true);
  });

  it('should fallback to IndexedDBDataService when Firebase is disabled or unconfigured', () => {
    vi.stubEnv('VITE_USE_FIREBASE', 'false');
    const service = getDataService();
    expect(service).toBe(indexedDbService);
  });

  it('should return FirestoreDataService when forceBackend is firestore', () => {
    const service = getDataService('firestore');
    expect(service).toBe(firestoreService);
  });
});
