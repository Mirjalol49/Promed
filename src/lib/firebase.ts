import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';

// Your web app's Firebase configuration
export const firebaseConfig = {
    apiKey: "AIzaSyD_FGKU1Lzdp-DJRr7tgXehH2JmuAZKMYc",
    authDomain: "graft-dashboard.firebaseapp.com",
    projectId: "graft-dashboard",
    storageBucket: "graft-dashboard.firebasestorage.app",
    messagingSenderId: "120238255414",
    appId: "1:120238255414:web:f0aa109b5f80644e845797",
    measurementId: "G-VSREQ7WEVP",
    databaseURL: "https://graft-dashboard-default-rtdb.firebaseio.com"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
// Initialize Firestore with offline persistence
export const db = getFirestore(app);

// Enable offline persistence for better cross-device sync
// Enable offline persistence for better cross-device sync
// persistence creates issues with multiple tabs in dev, disabling for stability
/*
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
        console.warn('⚠️ Firestore persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
        console.warn('⚠️ Firestore persistence not supported in this browser');
    } else {
        console.error('❌ Firestore persistence error:', err);
    }
});
*/

// Debug Logging - Confirm Connection
console.log("🔥 Firebase Init: Project =", firebaseConfig.projectId);
// @ts-ignore
const dbName = (db as any)._databaseId?.database || "(default)";
console.log("📦 Firestore Init: Database =", dbName);
export const storage = getStorage(app);
// Analytics disabled to prevent content blocker issues
// export const analytics = getAnalytics(app);

// Initialize Cloud Functions
import { getFunctions } from 'firebase/functions';
export const functions = getFunctions(app);
