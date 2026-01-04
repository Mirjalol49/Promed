const { initializeApp } = require("firebase/app");
const { getFirestore, doc, getDoc } = require("firebase/firestore");

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
const db = getFirestore(app);

const UID = "Zb7LdEga3zP9NluxZEwkcBdZi0p2";

async function checkProfile() {
    console.log(`Checking profile for UID: ${UID}...`);
    try {
        const docRef = doc(db, "profiles", UID);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            console.log("✅ Document data:", JSON.stringify(docSnap.data(), null, 2));
        } else {
            console.log("❌ No such document!");
        }
        process.exit(0);
    } catch (error) {
        console.error("❌ FAILED:", error.code, error.message);
        process.exit(1);
    }
}

checkProfile();
