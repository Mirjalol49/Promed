// Removed firebase-admin dependency
// Or better, just use the existing firebase config if we can run it in a way that checks. 
// Actually, let's just use the `check_rest_primed.cjs` style or existing `test_trigger.js` modified.

// Let's rely on the authenticated session or use a simple check if I have admin access. 
// I'll try to use the existing 'functions/index.js' context or similar if possible, but simplest is a standalone script if I have creds.
// Since I don't have service-account.json handy in the file list (I see active workspaces), I'll verify if I can use `firebase-admin` with default creds if logged in.
// But wait, `check_rest_primed.cjs` is listed in open files. Let's see what it does.

// Plan B: I'll use `run_command` to inspect via firebase-tools if possible, or just add logs.
// Plan C: I'll create a script that uses the web client SDK (like `test_trigger.js` did) to read `outbound_messages`.

const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, query, orderBy, limit } = require("firebase/firestore");

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

async function checkPendingMessages() {
    console.log("Checking PENDING outbound messages...");
    const q = query(
        collection(db, "outbound_messages"),
        where("status", "==", "PENDING"),
        orderBy("createdAt", "desc"),
        limit(5)
    );
    // Note: orderBy requires an index if used with where on a different field. 
    // If it fails, we fall back to just filtering in code or simple query.
    // Let's try simple query first to avoid index errors.

    // const simpleQ = query(collection(db, "outbound_messages"), where("status", "==", "PENDING"));
    // Actually, let's use the first query. Firebase usually links to create an index if missing.
    // To be safe and quick, I'll just get recent ones and filter.

    const recentQ = query(collection(db, "outbound_messages"), orderBy("createdAt", "desc"), limit(10));
    const snapshot = await getDocs(recentQ);

    if (snapshot.empty) {
        console.log("No messages found at all.");
    } else {
        console.log(`Found ${snapshot.size} recent messages:`);
        snapshot.forEach(doc => {
            const data = doc.data();
            console.log(`[${data.status}] ${data.createdAt} - To: ${data.patientName} (${data.telegramChatId})`);
        });
    }
    process.exit(0);
}

const { where } = require("firebase/firestore"); // Ensure 'where' is imported if I use it, but I used orderBy. 
// I'll stick to 'recentQ' which relies on 'orderBy' and 'limit' which are already imported.

checkPendingMessages();
