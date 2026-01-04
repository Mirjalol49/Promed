const { initializeApp } = require("firebase/app");
const { getFirestore, setDoc, doc } = require("firebase/firestore");

const firebaseConfig = {
    apiKey: "AIzaSyD_FGKU1Lzdp-DJRr7tgXehH2JmuAZKMYc",
    authDomain: "graft-dashboard.firebaseapp.com",
    projectId: "graft-dashboard",
    storageBucket: "graft-dashboard.firebasestorage.app",
    messagingSenderId: "120238255414",
    appId: "1:120238255414:web:f0aa109b5f80644e845797",
    measurementId: "G-VSREQ7WEVP"
};

console.log("--- Testing 'graft-dashboard' Database ---");

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testWrite() {
    try {
        console.log("Attempting write to default db...");
        await setDoc(doc(db, "diagnostics", "test_connectivity"), {
            status: "connected",
            timestamp: new Date().toISOString(),
            agent: "Antigravity"
        });
        console.log("✅ SUCCESS: Written to Firestore!");
    } catch (error) {
        console.error("❌ FAILED:");
        console.error("   Code:", error.code);
        console.error("   Msg: ", error.message);
        process.exit(1);
    }
}

testWrite();
