
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, query, where, getDocs } = require("firebase/firestore");

const firebaseConfig = {
    projectId: "graft-dashboard",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function diagnose() {
    console.log("🔍 Checking all patients in DB...");
    const patientsRef = collection(db, "patients");

    try {
        const snapshot = await getDocs(patientsRef);

        if (snapshot.empty) {
            console.log("❌ No patients found in DB at all!");
            process.exit(0);
        }

        console.log(`✅ Found ${snapshot.size} patients total.`);

        snapshot.forEach(doc => {
            const data = doc.data();
            console.log(`- [${doc.id}] Name: ${data.full_name}, AccountID: ${data.account_id}, UserID: ${data.user_id}, Created: ${data.created_at}`);
        });
    } catch (error) {
        console.error("Error during diagnosis:", error);
    }

    process.exit(0);
}

diagnose();
