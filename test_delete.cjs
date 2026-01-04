
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, getDocs, deleteDoc, doc } = require('firebase/firestore');

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

async function testDelete() {
    console.log("🔐 Authenticating...");
    await signInWithEmailAndPassword(auth, "mirjalolreactjs@gmail.com", "password123");
    console.log("✅ Authenticated.");

    console.log("🔍 Fetching patients...");
    const snapshot = await getDocs(collection(db, "patients"));
    const patients = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    if (patients.length === 0) {
        console.log("🛑 No patients found to delete.");
        return;
    }

    const target = patients[0];
    console.log(`🗑️ Attempting to delete patient: ${target.full_name} (ID: ${target.id})`);

    try {
        await deleteDoc(doc(db, "patients", target.id));
        console.log("🟢 DELETE SUCCESS!");

        // Final check
        const snapshot2 = await getDocs(collection(db, "patients"));
        const exists = snapshot2.docs.some(d => d.id === target.id);
        if (exists) {
            console.error("🔴 ERROR: Document STILL EXISTS after successful delete call!");
        } else {
            console.log("✅ Document confirmed GONE from DB.");
        }
    } catch (e) {
        console.error("🔴 DELETE FAILED:", e.message);
    }
}

testDelete().catch(console.error);
