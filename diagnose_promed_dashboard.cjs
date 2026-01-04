
const { initializeApp } = require('firebase/app');
const { doc, setDoc, initializeFirestore } = require('firebase/firestore');

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

async function testDatabase(dbName) {
    console.log(`--- Testing '${dbName}' Database ---`);
    try {
        const db = initializeFirestore(app, {}, dbName);
        console.log(`Attempting write to '${dbName}'...`);
        await setDoc(doc(db, 'diagnostics', `test_${Date.now()}`), {
            ok: true,
            timestamp: new Date().toISOString()
        });
        console.log(`✅ SUCCESS: Connected to '${dbName}' database!`);
    } catch (error) {
        console.log(`❌ FAILED (${dbName}):`);
        console.log(`   Code: ${error.code}`);
        console.log(`   Msg:  ${error.message}`);
    }
}

async function run() {
    await testDatabase("promed");
    process.exit(0);
}

run();
