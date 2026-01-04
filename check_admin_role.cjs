
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyD_FGKU1Lzdp-DJRr7tgXehH2JmuAZKMYc",
    authDomain: "graft-dashboard.firebaseapp.com",
    projectId: "graft-dashboard",
    storageBucket: "graft-dashboard.firebasestorage.app",
    messagingSenderId: "120238255414",
    appId: "1:120238255414:web:f0aa109b5f80644e845797",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const UID = "Zb7LdEga3zP9NluxZEwkcBdZi0p2"; // Your UID

async function check() {
    try {
        const snap = await getDoc(doc(db, "profiles", UID));
        if (snap.exists()) {
            console.log("✅ PROFILE FOUND:");
            console.log(JSON.stringify(snap.data(), null, 2));
        } else {
            console.log("❌ PROFILE NOT FOUND");
        }
    } catch (e) {
        console.error("❌ ERROR:", e.message);
    }
}

check();
