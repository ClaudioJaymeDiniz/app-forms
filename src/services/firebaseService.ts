import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import Constants from 'expo-constants';

type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
};

const cfg = (Constants?.expoConfig?.extra?.firebase as FirebaseConfig | undefined);

const app = initializeApp(cfg || {
  // apiKey: 'AIzaSyC72G3KVj8WgzMGUprpxQCCT1P-S4vouE8',
  apiKey: 'AIzaSyDbEb59SgPfykXPaErRoItem8rHDgcgJ1E',
  authDomain: 'appfatec-7c29c.firebaseapp.com',
  projectId: 'appfatec-7c29c',
});

export const auth = getAuth(app);
export const db = getFirestore(app);

export const collections = {
  users: 'users',
  projects: 'projects',
  reports: 'reports',
  submissions: 'report_submissions',
  notifications: 'notifications',
  syncQueue: 'sync_queue'
};