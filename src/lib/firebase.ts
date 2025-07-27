
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, initializeAuth, browserPopupRedirectResolver, indexedDBLocalPersistence, type Auth } from 'firebase/auth';
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
const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

let auth: Auth;

// Conditionally initialize Auth for browser and server environments.
// This is the key to fixing the popup issue in new windows.
if (typeof window !== 'undefined') {
  // On the client-side, we use initializeAuth with the browserPopupRedirectResolver.
  // This resolver is specifically designed to handle cross-origin authentication popups.
  auth = initializeAuth(app, {
    persistence: indexedDBLocalPersistence,
    popupRedirectResolver: browserPopupRedirectResolver,
  });
} else {
  // On the server-side, we use the standard getAuth.
  auth = getAuth(app);
}

const db = getFirestore(app);

export { app, auth, db };
