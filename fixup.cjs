const admin = require('firebase-admin');

admin.initializeApp({
    projectId: "graft-dashboard",
    credential: admin.credential.applicationDefault()
});

const db = admin.firestore();

async function fix() {
    try {
        console.log("Analyzing patients to find the real accountId...");
        const patients = await db.collection('patients').get();
        const accountCounts = {};

        let targetPatientSnippet = null;

        patients.forEach(doc => {
            const data = doc.data();
            const accId = data.accountId || data.account_id;
            if (accId) {
                accountCounts[accId] = (accountCounts[accId] || 0) + 1;
                if (!targetPatientSnippet) targetPatientSnippet = { id: doc.id, name: data.fullName, accountId: accId };
            }
        });

        console.log("Patient counts by accountId:", accountCounts);

        if (Object.keys(accountCounts).length === 0) {
            console.log("NO PATIENTS FOUND IN DATABASE. THIS SHOULD NOT HAPPEN.");
            return;
        }

        // Find the accountId with the max patients
        let maxCount = 0;
        let realAccountId = null;
        for (const [accId, count] of Object.entries(accountCounts)) {
            if (count > maxCount) {
                maxCount = count;
                realAccountId = accId;
            }
        }

        console.log(`\n=> The REAL Account ID with the most patients is: ${realAccountId} (${maxCount} patients)`);

        // Now find the profile that matches the phone number 937489141
        console.log("\nLooking for profiles with phone 937489141...");
        const profiles = await db.collection('profiles').get();
        let targetUid = null;

        for (const doc of profiles.docs) {
            const data = doc.data();
            const phoneStr = (data.phone || data.phoneNumber || "").replace(/\s+/g, '');
            if (phoneStr.includes('937489141')) {
                console.log(`Found Profile! UID: ${doc.id}`);
                console.log(`Current Profile Data:`, data);
                targetUid = doc.id;
            }
        }

        // Also check if they are in 'users' collection instead of 'profiles'
        if (!targetUid) {
            console.log("Not found in 'profiles', checking 'users'...");
            const users = await db.collection('users').get();
            for (const doc of users.docs) {
                const data = doc.data();
                const phoneStr = (data.phoneNumber || data.phone || "").replace(/\s+/g, '');
                if (phoneStr.includes('937489141')) {
                    console.log(`Found in users! UID: ${doc.id}`);
                    targetUid = doc.id;
                }
            }
        }

        if (targetUid) {
            console.log(`\n🚨 Restoring UID ${targetUid} to be admin of account: ${realAccountId}`);
            await db.collection('profiles').doc(targetUid).set({
                role: 'admin',
                accountId: realAccountId,
                account_id: realAccountId,
                migrated_from_staff: false
            }, { merge: true });
            console.log("✅ Restore complete.");
        } else {
            console.log("Could not find a user profile with that phone number.");
        }

    } catch (e) {
        console.error("Error:", e);
    }
}

fix();
