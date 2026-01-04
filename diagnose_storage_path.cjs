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

async function testPathUpload() {
    console.log("--- Testing 'patients/' Path Upload ---");

    try {
        console.log("Authenticating...");
        await signInWithEmailAndPassword(auth, EMAIL, PASSWORD);
        console.log("✅ Logged in.");

        // TEST THE EXACT PATH PATTERN THE USER REPORTED
        // 'patients/temp-1766848562082/profile_1766848564500.png'
        const testPath = `patients/temp-${Date.now()}/test_profile.png`;

        console.log(`Attempting upload to: ${testPath}`);
        const storageRef = ref(storage, testPath);
        const message = "Path Permission Test Payload";

        await uploadString(storageRef, message);
        console.log("✅ SUCCESS: Uploaded to 'patients/' path!");
        process.exit(0);

    } catch (error) {
        console.error("❌ FAILED:", error.code, error.message);
        process.exit(1);
    }
}

testPathUpload();
