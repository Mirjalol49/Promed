import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs, updateDoc, doc } from "firebase/firestore";

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

    let updated = 0;
    for (const d of snap.docs) {
        const data = d.data();
        if (data.role === 'admin' && data.email && !['mirjalolreactjs@gmail.com', 'admin@graft.com', 'superadmin@graft.local'].includes(data.email)) {
            console.log(`Setting ${data.email} to superadmin`);
            try {
                // If they don't have write access here, we'll see but we should
                await updateDoc(doc(db, "profiles", d.id), { role: 'superadmin' });
                updated++;
            } catch (e) { console.error("Could not update:", data.email, e.message); }
        }
    }

    console.log(`Updated ${updated} accounts to superadmin!`);
    process.exit(0);
}
main().catch(console.error);
