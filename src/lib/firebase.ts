
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
const db = getFirestore(app);

// We need to make sure auth is only initialized on the client
let auth: Auth;
if (typeof window !== 'undefined') {
  auth = initializeAuth(app, {
    persistence: indexedDBLocalPersistence,
    popupRedirectResolver: browserPopupRedirectResolver,
  });
} else {
  // On the server, we use the standard getAuth.
  auth = getAuth(app);
}


export { app, auth, db };
