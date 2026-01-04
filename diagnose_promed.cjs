
const { initializeApp } = require('firebase/app');
const { initializeFirestore, doc, setDoc } = require('firebase/firestore');

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
    console.log("--- Testing 'promed' Database ---");
    try {
        // Initialize specifically for 'promed'
        const db = initializeFirestore(app, {}, "promed");

        console.log("Attempting write to 'promed'...");
        await setDoc(doc(db, 'diagnostics', `test_promed_${Date.now()}`), {
            ok: true,
            timestamp: new Date().toISOString()
        });
        console.log("✅ SUCCESS: Connected to 'promed' database!");
        process.exit(0);
    } catch (error) {
        console.log("❌ FAILED (promed):");
        console.log(`   Code: ${error.code}`);
        console.log(`   Msg:  ${error.message}`);
        process.exit(1);
    }
}

run();
