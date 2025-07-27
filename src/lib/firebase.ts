
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, browserPopupRedirectResolver } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "mindflow-xkqs8",
  appId: "1:100690045229:web:6c3734c9eef3f14d380ba4",
  storageBucket: "mindflow-xkqs8.firebasestorage.app",
  apiKey: "AIzaSyDjMPfU582hyrOANNwakqElBfSRQx7Mce0",
  authDomain: "mindflow-xkqs8.firebaseapp.com",
  messagingSenderId: "100690045229",
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app, {
    persistence: undefined,
    popupRedirectResolver: browserPopupRedirectResolver,
});

auth.tenantId = '__';

const db = getFirestore(app);

export { app, auth, db };
