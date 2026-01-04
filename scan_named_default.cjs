const { initializeApp } = require('firebase/app');
const { initializeFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyD_FGKU1Lzdp-DJRr7tgXehH2JmuAZKMYc",
    authDomain: "graft-dashboard.firebaseapp.com",
    projectId: "graft-dashboard",
};

const app = initializeApp(firebaseConfig);

async function scanNamedDefault() {
    const dbId = "default"; // The named one!
    console.log(`\n🔍 Checking named database: ${dbId}...`);
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

scanNamedDefault();
