
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyD_FGKU1Lzdp-DJRr7tgXehH2JmuAZKMYc",
    authDomain: "graft-dashboard.firebaseapp.com",
    projectId: "graft-dashboard",
    storageBucket: "graft-dashboard.firebasestorage.app",
    messagingSenderId: "120238255414",
    appId: "1:120238255414:web:f0aa109b5f80644e845797",
    databaseURL: "https://graft-dashboard-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const BOT_EMAIL = "system_bot@graft.local";
const BOT_PASS = "BotSecurePassword123!";

async function checkQueue() {
    try {
        await signInWithEmailAndPassword(auth, BOT_EMAIL, BOT_PASS);
        console.log("🔐 Authenticated.");

        console.log("Checking LAST 10 tasks in **outbound_tasks**...");

        // Use query without status filter to see history
        const q = query(collection(db, 'outbound_tasks'), orderBy('createdAt', 'desc'), limit(10));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            console.log("❌ NO TASKS FOUND in outbound_tasks.");
        } else {
            console.log(`✅ FOUND ${snapshot.size} TASKS:`);
            snapshot.docs.forEach(doc => {
                const d = doc.data();
                console.log(`- [${doc.id}] Status: ${d.status} | Action: '${d.action}' | ID: ${d.telegramMessageId} | Text: "${d.text?.substring(0, 15)}..."`);
            });
        }
    } catch (e) {
        console.error("Error:", e);
    }
    process.exit(0);
}

checkQueue();
