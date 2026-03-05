const admin = require('firebase-admin');

// Ensure we pick up the default credentials for the current gcloud/firebase login
const app = admin.initializeApp({
    projectId: "graft-dashboard",
    credential: admin.credential.applicationDefault()
});

const db = admin.firestore();

async function fix() {
    console.log("Searching for wrongly migrated profiles in the last hour...");
    // Find all profiles with migrated_from_staff = true
    const snap = await db.collection('profiles').where('migrated_from_staff', '==', true).get();

    let changed = 0;
    for (const doc of snap.docs) {
        const data = doc.data();
        // If it was modified recently, we can guess it
        console.log(`Checking profile ${doc.id}...`, data.fullName, data.role, data.accountId);

        // Let's assume the owner's UID is the same as the original accountId 
        // Admin accounts originally had accountId = document ID.
        // Or wait, is their UID something else?

        // Let's print out all
    }

    // Also, we can just look up the user by email if we know it.
    console.log("Done checking.");
}

fix().catch(console.error);
