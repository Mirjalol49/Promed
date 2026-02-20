import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";

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
    const mirjalolId = "322B026jfWTevIGDKNdIqKZ1O3f2";

    await setDoc(doc(db, "profiles", shahzodaId), {
        id: shahzodaId,
        fullName: "shahzoda",
        phone: "+998997489141",
        email: "shahzoda@promed.sys", // dummy
        role: "nurse",
        status: "active",
        account_id: `account_${mirjalolId}`,
        accountId: `account_${mirjalolId}`,
        lockPassword: "111111", // default
        created_at: new Date().toISOString()
    });

    console.log("RESTORED SHAHZODA TO MIRJALOL");

    process.exit(0);
}
main().catch(console.error);
