const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { initializeFirestore, collection, getDocs } = require('firebase/firestore');

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
const auth = getAuth(app);
const db = initializeFirestore(app, {}, "primed");

async function checkPrimed() {
    console.log("🔐 Authenticating (graft-24962)...");
    try {
        await signInWithEmailAndPassword(auth, "mirjalolreactjs@gmail.com", "password123");
        console.log("✅ Authenticated.");

        console.log("🔍 Fetching patients from 'primed' database...");
        const snapshot = await getDocs(collection(db, "patients"));
        console.log(`📊 Found ${snapshot.docs.length} patients in 'primed'.`);
        snapshot.docs.forEach(d => {
            console.log(`📍 Patient: ${d.data().full_name} | ID: ${d.id}`);
        });
    } catch (e) {
        console.error("❌ Error:", e.message);
    }
}

checkPrimed();
