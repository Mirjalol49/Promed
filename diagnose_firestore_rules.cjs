const { initializeApp } = require("firebase/app");
const { getFirestore, doc, setDoc, getAuth, signInWithEmailAndPassword } = require("firebase/firestore");
// Note: importing auth from firebase/auth for login
const { getAuth: getAuthTypes, signInWithEmailAndPassword: signIn } = require("firebase/auth");

const firebaseConfig = {
    apiKey: "AIzaSyD_FGKU1Lzdp-DJRr7tgXehH2JmuAZKMYc",
    authDomain: "graft-dashboard.firebaseapp.com",
    projectId: "graft-dashboard",
    storageBucket: "graft-dashboard.firebasestorage.app",
    messagingSenderId: "120238255414",
    appId: "1:120238255414:web:f0aa109b5f80644e845797",
    measurementId: "G-VSREQ7WEVP"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuthTypes(app);

const EMAIL = "mirjalolreactjs@gmail.com";
const PASSWORD = "password123";

async function checkFirestoreRules() {
    console.log("--- Testing Firestore Rules ---");

    try {
        // 1. Authenticate
        console.log("Authenticating...");
        const cred = await signIn(auth, EMAIL, PASSWORD);
        const uid = cred.user.uid;
        console.log(`✅ Logged in as ${uid}`);

        // 2. Try to write to the user's profile
        console.log("Attempting write to profile...");
        const docRef = doc(db, "profiles", uid);
        // Merge true to avoid overwriting existing data if any
        await setDoc(docRef, {
            test_field: "write_access_confirmed",
            updated_at: new Date().toISOString()
        }, { merge: true });

        console.log("✅ SUCCESS: Firestore write succeeded!");
        console.log("Rules are likely OK.");
        process.exit(0);

    } catch (error) {
        console.error("❌ FAILED:", error.code, error.message);
        if (error.code === 'permission-denied') {
            console.log("👉 Suggestion: Check FIRESTORE Rules in Firebase Console.");
        }
        process.exit(1);
    }
}

checkFirestoreRules();
