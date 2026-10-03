import { initializeApp } from 'firebase/app';
import { initializeFirestore, memoryLocalCache } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Use memoryLocalCache to bypass persistence issues in the AIS environment
// and avoid "client is offline" errors when indexDB is locked/blocked.
export const db = initializeFirestore(app, {
  localCache: memoryLocalCache()
});
