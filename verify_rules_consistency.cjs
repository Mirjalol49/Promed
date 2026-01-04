const { initializeApp } = require("firebase/app");
const { getAuth, signInWithEmailAndPassword } = require("firebase/auth");
const { getStorage, ref, uploadString } = require("firebase/storage");

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
const auth = getAuth(app);
const storage = getStorage(app);

const EMAIL = "mirjalolreactjs@gmail.com";
const PASSWORD = "password123";

async function verifyConsistency() {
    console.log("--- Verifying Storage Rules Consistency ---");

    try {
        await signInWithEmailAndPassword(auth, EMAIL, PASSWORD);
        console.log("✅ Authenticated.");

        // TEST 1: Diagnostics Path (Previously worked)
        console.log("1. Testing 'diagnostics/' path...");
        try {
            await uploadString(ref(storage, "diagnostics/check.txt"), "ok");
            console.log("   ✅ PASS: 'diagnostics/' is writable.");
        } catch (e) {
            console.log("   ❌ FAIL: 'diagnostics/' blocked. (" + e.code + ")");
        }

        // TEST 2: Patients Path (Previously failed)
        console.log("2. Testing 'patients/' path...");
        try {
            await uploadString(ref(storage, "patients/check.txt"), "ok");
            console.log("   ✅ PASS: 'patients/' is writable.");
        } catch (e) {
            console.log("   ❌ FAIL: 'patients/' blocked. (" + e.code + ")");
        }

        process.exit(0);

    } catch (error) {
        console.error("❌ CRITICAL AUTH ERROR:", error.code, error.message);
        process.exit(1);
    }
}

verifyConsistency();
