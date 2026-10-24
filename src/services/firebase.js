import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAXpaUme6nz6uxlnHSB8BPFwgEMZkui58A",
  authDomain: "fudido-flix.firebaseapp.com",
  projectId: "fudido-flix",
  storageBucket: "fudido-flix.firebasestorage.app",
  messagingSenderId: "567531221431",
  appId: "1:567531221431:web:16e997604d3ca8a83ff832"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;
