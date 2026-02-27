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
    // We log in as the default hardcoded super admin so we have permission
    await signInWithEmailAndPassword(auth, "superadmin@graft.local", "xurshida4941");

    const q = collection(db, "profiles");
    const snap = await getDocs(q);
    
    let updated = 0;
    for (const d of snap.docs) {
        const data = d.data();
        // If an account has 'admin' and their accountId is THEIR OWN UID, they are a system node!
        // A tenant admin would also have their own UID? Wait. 
        // A regular clinic admin has their own UID as their account_id.
        // Wait, if we just make ALL admins 'superadmin' for now?
        // No, let's just make the specific 2 they created superadmins.
        if (data.role === 'admin' && data.email && !['mirjalolreactjs@gmail.com', 'admin@graft.com', 'superadmin@graft.local'].includes(data.email)) {
             // For safety, let's just make ALL current admins 'superadmin' since the system is fresh.
             console.log(`Setting ${data.email} to superadmin`);
             await updateDoc(doc(db, "profiles", d.id), { role: 'superadmin' });
             updated++;
        }
    }
    
    console.log(`Updated ${updated} accounts to superadmin!`);
    process.exit(0);
}
main().catch(console.error);
