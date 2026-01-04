const { initializeApp } = require("firebase/app");
const { getAuth, createUserWithEmailAndPassword } = require("firebase/auth");
const { getFirestore, setDoc, doc } = require("firebase/firestore");

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
const db = getFirestore(app);

const EMAIL = "mirjalolreactjs@gmail.com";
const PASSWORD = "password123";

async function createAdmin() {
    console.log(`Creating user: ${EMAIL}...`);
    try {
        // 1. Create Auth User
        const userCredential = await createUserWithEmailAndPassword(auth, EMAIL, PASSWORD);
        const user = userCredential.user;
        console.log("✅ Auth User created:", user.uid);

        // 2. Create Profile in Firestore
        console.log("Creating Firestore profile...");
        await setDoc(doc(db, "profiles", user.uid), {
            email: EMAIL,
            role: "admin",
            full_name: "Admin User",
            created_at: new Date().toISOString(),
            status: "active"
        });
        console.log("✅ Profile created!");
        console.log("------------------------------------------");
        console.log("LOGIN DETAILS:");
        console.log("Email: " + EMAIL);
        console.log("Password: " + PASSWORD);
        console.log("------------------------------------------");
        process.exit(0);
    } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
            console.log("⚠️ User already exists. You should be able to login.");
            // Try to update profile just in case
            console.log("Updating profile anyway...");
            // We can't get UID easily without login, so we skip unless we sign in.
        } else {
            console.error("❌ FAILED:", error.code, error.message);
        }
        process.exit(1);
    }
}

createAdmin();
