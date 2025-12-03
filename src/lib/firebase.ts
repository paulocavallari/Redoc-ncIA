
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAWhS5v2oMQv5LTvY-p1gQhZeu_JuTMF8M",
  authDomain: "redocencia-b8305.firebaseapp.com",
  projectId: "redocencia-b8305",
  storageBucket: "redocencia-b8305.firebasestorage.app",
  messagingSenderId: "1008418682365",
  appId: "1:1008418682365:web:e02a29f98d194252d65594",
  measurementId: "G-QVSZMFHL1P"
};


// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
