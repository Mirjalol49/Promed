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

async function testStorageWithAuth() {
    console.log("--- Testing Authenticated Storage Access ---");

    try {
        // 1. Authenticate
        console.log("Authenticating...");
        await signInWithEmailAndPassword(auth, EMAIL, PASSWORD);
        console.log("✅ Logged in.");

        // 2. Upload
        const storageRef = ref(storage, "diagnostics/auth_test_upload.txt");
        const message = "This file verifies that Authenticated Users can upload.";

        console.log("Attempting upload as user...");
        await uploadString(storageRef, message);
        console.log("✅ SUCCESS: Uploaded to Storage!");
        process.exit(0);

    } catch (error) {
        console.error("❌ FAILED:", error.code, error.message);
        process.exit(1);
    }
}

testStorageWithAuth();
