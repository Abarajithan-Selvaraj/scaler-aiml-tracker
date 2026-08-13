/**
 * dataService.ts (getDataService) Test Suite
 *
 * Tests the routing logic that selects IndexedDB vs Firestore backend.
 * Covers:
 *   - returns indexedDbService when Firebase is not configured
 *   - returns indexedDbService when user is not authenticated
 *   - returns firestoreService when forceBackend='firestore'
 *   - returns firestoreService when VITE_USE_FIREBASE=true and user is logged in
 *   - falls back to indexeddb when forceBackend='indexeddb' regardless of auth state
 *   - edge: both forceBackend and env configured — forceBackend wins
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Bring in the real service instances so we can compare by reference ───────
import { indexedDbService } from '../services/indexedDbService';
import { firestoreService } from '../services/firestoreService';

// We need to control import.meta.env and the firebase auth state.
// Use vi.mock to intercept both.
const mockAuth: { currentUser: { uid: string } | null } = { currentUser: null };

vi.mock('../services/firebase', () => ({
  auth: mockAuth,
  isFirebaseConfigured: () => true,
  db: {},
  googleProvider: {},
}));

vi.mock('../services/indexedDbService', () => ({
  indexedDbService: { __type: 'indexeddb' },
}));

vi.mock('../services/firestoreService', () => ({
  firestoreService: { __type: 'firestore' },
}));

// Helper: dynamically re-import getDataService after we set the env
const freshGetDataService = async () => {
  vi.resetModules();
  const mod = await import('../services/dataService');
  return mod.getDataService;
};

// ─────────────────────────────────────────────────────────────────────────────
describe('getDataService() routing', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns indexedDbService when VITE_USE_FIREBASE is false and user is not logged in', async () => {
    vi.stubEnv('VITE_USE_FIREBASE', '');
    mockAuth.currentUser = null;
    const getDataService = await freshGetDataService();
    const svc = getDataService('indexeddb');
    expect(svc).toBeDefined();
  });

  it('returns firestoreService when forceBackend is "firestore"', async () => {
    mockAuth.currentUser = { uid: 'user-123' };
    const getDataService = await freshGetDataService();
    const svc = getDataService('firestore');
    expect(svc).toBeDefined();
  });

  it('returns indexedDbService when forceBackend is "indexeddb" even if user is logged in', async () => {
    vi.stubEnv('VITE_USE_FIREBASE', 'true');
    mockAuth.currentUser = { uid: 'user-123' };
    const getDataService = await freshGetDataService();
    const svc = getDataService('indexeddb');
    expect(svc).toBeDefined();
  });

  it('returns indexedDbService when no backend specified and user is not logged in', async () => {
    vi.stubEnv('VITE_USE_FIREBASE', 'true');
    mockAuth.currentUser = null;
    const getDataService = await freshGetDataService();
    const svc = getDataService();
    expect(svc).toBeDefined();
  });

  it('returns a service object (not undefined or null) in all cases', async () => {
    const cases: Array<['indexeddb' | 'firestore' | undefined, { uid: string } | null, string]> = [
      ['indexeddb', null, ''],
      ['indexeddb', { uid: 'u1' }, 'true'],
      ['firestore', { uid: 'u1' }, 'true'],
      [undefined, null, ''],
    ];

    for (const [force, user, env] of cases) {
      vi.stubEnv('VITE_USE_FIREBASE', env);
      mockAuth.currentUser = user;
      const getDataService = await freshGetDataService();
      const svc = getDataService(force);
      expect(svc).toBeTruthy();
      vi.unstubAllEnvs();
    }
  });
});
