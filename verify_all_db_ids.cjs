
const { initializeApp } = require('firebase/app');
const { doc, getDoc, setDoc, initializeFirestore, getFirestore } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

const firebaseConfig = {
    apiKey: "AIzaSyD_FGKU1Lzdp-DJRr7tgXehH2JmuAZKMYc",
    authDomain: "graft-dashboard.firebaseapp.com",
    projectId: "graft-dashboard",
    storageBucket: "graft-dashboard.firebasestorage.app",
    messagingSenderId: "120238255414",
    appId: "1:120238255414:web:f0aa109b5f80644e845797",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Test both default and no-db initialization
async function runTest(dbId) {
    console.log(`\n--- TEST START: Database ID='${dbId}' ---`);
    try {
        const db = dbId ? initializeFirestore(app, {}, dbId) : getFirestore(app);

        console.log("1. Authenticating...");
        const cred = await signInWithEmailAndPassword(auth, "mirjalolreactjs@gmail.com", "password123");
        console.log(`✅ Auth OK. UID: ${cred.user.uid}`);

        console.log(`2. Attempting write to 'diagnostics/test' in '${dbId || 'standard'}'...`);
        const testRef = doc(db, "diagnostics", "test_" + Date.now());
        await setDoc(testRef, {
            ok: true,
            timestamp: new Date().toISOString(),
            dbIdUsed: dbId || "standard"
        });
        console.log(`✅ SUCCESS: Write to '${dbId || 'standard'}' succeeded!`);
    } catch (error) {
        console.error(`❌ FAILED: ${error.code} - ${error.message}`);
    }
}

async function start() {
    await runTest("default");
    await runTest("(default)");
    await runTest(""); // Standard getFirestore
    process.exit(0);
}

start();
