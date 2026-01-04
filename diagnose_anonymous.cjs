const { initializeApp } = require("firebase/app");
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
const storage = getStorage(app);

async function testAnonymousUpload() {
    console.log("--- Testing ANONYMOUS Storage Access ---");

    try {
        const storageRef = ref(storage, "diagnostics/anon_test.txt");
        const message = "Anonymous Upload Test";

        console.log("Attempting upload WITHOUT logging in...");
        await uploadString(storageRef, message);
        console.log("✅ SUCCESS: Anonymous upload worked! Rules are Public.");
        process.exit(0);

    } catch (error) {
        console.error("❌ FAILED:", error.code, error.message);
        process.exit(1);
    }
}

testAnonymousUpload();
