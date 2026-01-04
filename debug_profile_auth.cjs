
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, initializeFirestore } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

const firebaseConfig = {
    apiKey: "AIzaSyD_FGKU1Lzdp-DJRr7tgXehH2JmuAZKMYc",
    authDomain: "graft-dashboard.firebaseapp.com",
    projectId: "graft-dashboard",
    storageBucket: "graft-dashboard.firebasestorage.app",
    messagingSenderId: "120238255414",
    appId: "1:120238255414:web:f0aa109b5f80644e845797",
};

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, { experimentalForceLongPolling: true });
const auth = getAuth(app);

const EMAIL = "mirjalolreactjs@gmail.com";
const PASSWORD = "password123";

async function check() {
    try {
        console.log("Authenticating...");
        await signInWithEmailAndPassword(auth, EMAIL, PASSWORD);
        console.log("Authenticated.");

        const snap = await getDoc(doc(db, "profiles", auth.currentUser.uid));
        if (snap.exists()) {
            console.log("✅ PROFILE DATA:");
            console.log(JSON.stringify(snap.data(), null, 2));
        } else {
            console.log("❌ PROFILE NOT FOUND");
        }
    } catch (e) {
        console.error("❌ ERROR:", e.message);
    }
}

check();
