
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
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

async function checkMessages() {
    try {
        await signInWithEmailAndPassword(auth, BOT_EMAIL, BOT_PASS);
        console.log("🔐 Authenticated as bot.");

        console.log("Checking messages for telegramMessageId...");
        const patients = await getDocs(collection(db, 'patients'));

        if (patients.empty) {
            console.log("No patients found.");
            process.exit(0);
        }

        // Check first 3 patients
        for (let i = 0; i < Math.min(3, patients.docs.length); i++) {
            const patientId = patients.docs[i].id;
            const patientName = patients.docs[i].data().fullName || "Unknown";
            console.log(`\nChecking messages for: ${patientName} (${patientId})`);

            const messages = await getDocs(collection(db, 'promed_passengers', patientId, 'messages'));
            if (messages.empty) console.log("- No messages.");

            messages.forEach(doc => {
                const data = doc.data();
                console.log(`  Msg ${doc.id}: telegramMessageId=${data.telegramMessageId} | Text: "${data.text?.substring(0, 15)}..."`);
            });
        }
    } catch (e) {
        console.error("Error:", e);
    }
    process.exit(0);
}

checkMessages();
