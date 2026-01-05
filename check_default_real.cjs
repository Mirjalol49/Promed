const { initializeApp } = require('firebase/app');
const { initializeFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyD_FGKU1Lzdp-DJRr7tgXehH2JmuAZKMYc",
    authDomain: "graft-dashboard.firebaseapp.com",
    projectId: "graft-dashboard",
};

const app = initializeApp(firebaseConfig);

async function checkDefault() {
    console.log(`\n🔍 Checking (default) database...`);
    try {
        const db = initializeFirestore(app, {});
        const snapshot = await getDocs(collection(db, "patients"));
        console.log(`   ✅ Success! Found ${snapshot.docs.length} patients.`);
    } catch (e) {
        console.log(`   ❌ Failed: ${e.message}`);
    }
}

checkDefault();
