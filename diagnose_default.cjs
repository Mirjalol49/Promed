
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, initializeFirestore } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyA5bBbxNXgkf3f4Xo7R6-QX2VtmS9sju5A",
    authDomain: "graft-24962.firebaseapp.com",
    projectId: "graft-24962",
    storageBucket: "graft-24962.firebasestorage.app",
    messagingSenderId: "316617635904",
    appId: "1:316617635904:web:b7b660eea96ec9072387a5",
    measurementId: "G-45KMKL3YLR"
};

const app = initializeApp(firebaseConfig);

async function run() {
    console.log("--- Testing '(default)' Database ---");
    try {
        // Use standard getFirestore which maps to '(default)'
        const db = getFirestore(app);

        console.log("Attempting write to '(default)'...");
        await setDoc(doc(db, 'diagnostics', `test_default_${Date.now()}`), {
            ok: true,
            timestamp: new Date().toISOString()
        });
        console.log("✅ SUCCESS: Connected to '(default)' database!");
    } catch (error) {
        console.log("❌ FAILED (default):");
        console.log(`   Code: ${error.code}`);
        console.log(`   Msg:  ${error.message}`);
    }
}

run();
