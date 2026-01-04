const { initializeApp } = require('firebase/app');
const { initializeFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyA5bBbxNXgkf3f4Xo7R6-QX2VtmS9sju5A",
    authDomain: "graft-24962.firebaseapp.com",
    projectId: "graft-24962",
};

const app = initializeApp(firebaseConfig);

async function scanDatabases() {
    const databases = ["(default)", "primed", "promed"];

    for (const dbId of databases) {
        console.log(`\n🔍 Checking database: ${dbId}...`);
        try {
            const db = initializeFirestore(app, {}, dbId);
            const snapshot = await getDocs(collection(db, "patients"));
            console.log(`   ✅ Success! Found ${snapshot.docs.length} patients.`);
            snapshot.docs.forEach(d => {
                console.log(`   📍 Patient: ${d.data().full_name} | ID: ${d.id}`);
            });
        } catch (e) {
            console.log(`   ❌ Failed: ${e.message}`);
        }
    }
}

scanDatabases();
