import { DataService } from '../types/tracker';
import { indexedDbService } from './indexedDbService';
import { firestoreService } from './firestoreService';
import { auth } from './firebase';

export function getDataService(forceBackend?: 'indexeddb' | 'firestore'): DataService {
  const useFirebaseEnv = import.meta.env.VITE_USE_FIREBASE === true;

  if (forceBackend === 'firestore' || (useFirebaseEnv && auth.currentUser)) {
    return firestoreService;
  }
  return indexedDbService;
}
