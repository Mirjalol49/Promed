import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyD_FGKU1Lzdp-DJRr7tgXehH2JmuAZKMYc",
    authDomain: "graft-dashboard.firebaseapp.com",
    projectId: "graft-dashboard",
    storageBucket: "graft-dashboard.firebasestorage.app",
    messagingSenderId: "120238255414",
    appId: "1:120238255414:web:f0aa109b5f80644e845797"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function main() {
    await signInWithEmailAndPassword(auth, "998937489141@promed.sys", "123456");

    const q = collection(db, "profiles");
    const snap = await getDocs(q);
    console.log("Total Profiles:", snap.size);

    snap.forEach(d => {
        const data = d.data();
        console.log(`| Name: ${data.fullName || data.full_name || 'N/A'} | Role: ${data.role} | UID: ${d.id} | acc_id: ${data.account_id} | accId: ${data.accountId}`);
    });

    process.exit(0);
}
main().catch(console.error);
