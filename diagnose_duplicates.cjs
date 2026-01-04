
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyD_FGKU1Lzdp-DJRr7tgXehH2JmuAZKMYc",
    authDomain: "graft-dashboard.firebaseapp.com",
    projectId: "graft-dashboard",
    storageBucket: "graft-dashboard.firebasestorage.app",
    messagingSenderId: "120238255414",
    appId: "1:120238255414:web:f0aa109b5f80644e845797",
    measurementId: "G-VSREQ7WEVP",
    databaseURL: "https://graft-dashboard-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function checkDuplicates() {
    console.log("🔐 Authenticating...");
    await signInWithEmailAndPassword(auth, "mirjalolreactjs@gmail.com", "password123");
    console.log("✅ Authenticated.");
    const snapshot = await getDocs(collection(db, "patients"));
    const patients = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    console.log(`📊 Found ${patients.length} total patients.`);

    const seen = new Map();
    const duplicates = [];

    for (const p of patients) {
        console.log(`📍 Patient: ${p.full_name} | ID: ${p.id} | Account: ${p.account_id}`);
        const key = `${p.account_id}-${p.full_name}-${p.phone}`;
        if (seen.has(key)) {
            duplicates.push(p);
            console.log(`⚠️ Duplicate detected: ${p.full_name} (${p.phone}) - ID: ${p.id} (Existing ID: ${seen.get(key)})`);
        } else {
            seen.set(key, p.id);
        }
    }

    if (duplicates.length > 0) {
        console.log(`\n❌ Found ${duplicates.length} duplicate entries.`);
        // Note: We don't delete automatically in diagnostic mode unless requested
    } else {
        console.log("\n✅ No duplicates found based on Name + Phone + Account.");
    }
}

checkDuplicates().catch(console.error);
