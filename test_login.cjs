const { initializeApp } = require("firebase/app");
const { getAuth, signInWithEmailAndPassword } = require("firebase/auth");

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

const EMAIL = "mirjalolreactjs@gmail.com";
const PASSWORD = "password123";

async function testLogin() {
    console.log(`Testing Login: ${EMAIL}...`);
    try {
        const userCredential = await signInWithEmailAndPassword(auth, EMAIL, PASSWORD);
        const user = userCredential.user;
        console.log("✅ LOGIN SUCCESS!");
        console.log("UID:", user.uid);
        process.exit(0);
    } catch (error) {
        console.error("❌ FAILED:", error.code, error.message);
        process.exit(1);
    }
}

testLogin();
