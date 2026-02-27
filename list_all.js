import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs, doc, getDoc } from "firebase/firestore";

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
    await signInWithEmailAndPassword(auth, "mirjalolreactjs@gmail.com", "mirjalol4941");
    console.log("Logged in as: ", auth.currentUser.email, "uid:", auth.currentUser.uid);
    try {
        const udoc = await getDoc(doc(db, "profiles", auth.currentUser.uid));
        console.log("My Profile Role:", udoc.data().role);
    } catch(e) { console.error("Could not read own profile?!", e.message); return; }

    try {
        const q = collection(db, "profiles");
        const snap = await getDocs(q);
        console.log("Wow it worked. Size: ", snap.size);
    } catch (e) {
        console.error("List failed:", e.message);
    }
    process.exit(0);
}
main().catch(console.error);
