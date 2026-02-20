import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";

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

    const shahzodaId = "zwB1BDThHdOQtxYqMHP2KUeZEe33";
    const snap = await getDoc(doc(db, "profiles", shahzodaId));

    if (snap.exists()) {
        console.log("FOUND SHAHZODA:", snap.data());
    } else {
        console.log("SHAHZODA DOES NOT EXIST IN PROFILES!");
    }

    process.exit(0);
}
main().catch(console.error);
