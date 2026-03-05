const admin = require('firebase-admin');

// Ensure we pick up the default credentials for the current gcloud/firebase login
admin.initializeApp({
    projectId: "graft-dashboard",
    credential: admin.credential.applicationDefault()
});

const db = admin.firestore();

async function run() {
    const phoneList = ["+998937489141", "+998 93 748 91 41", "937489141"];
    console.log("Looking for staff with phones:", phoneList);

    const staffSnap = await db.collection('staff').get();
    staffSnap.forEach(d => {
        const staff = d.data();
        const p = staff.phone ? staff.phone.replace(/\s+/g, '') : '';
        if (p.includes('937489141')) {
            console.log("---- STAFF FOUND ----");
            console.log("Name:", staff.fullName);
            console.log("Phone:", staff.phone);
            console.log("Role:", staff.role);
            console.log("AccountId:", staff.accountId);
            console.log("UID:", staff.uid);
            console.log("DocID:", d.id);
        }
    });

    console.log("Looking for profiles with those phones...");
    const profSnap = await db.collection('profiles').get();
    let userUid = null;
    let userAccountId = null;
    profSnap.forEach(d => {
        const prof = d.data();
        const p = prof.phone ? prof.phone.replace(/\s+/g, '') : '';
        if (p.includes('937489141')) {
            console.log("---- PROFILE FOUND ----");
            console.log("Name:", prof.fullName);
            console.log("Phone:", prof.phone);
            console.log("Role:", prof.role);
            console.log("AccountId:", prof.accountId);
            console.log("Account_Id:", prof.account_id);
            console.log("UID/DocID:", d.id);
            userUid = d.id;
        }
    });

    // Also, find out what accountId has lots of patients
    if (userUid) {
        console.log("Let's see if there are patients for accountId =", userUid);
        const p1 = await db.collection('patients').where('accountId', '==', userUid).count().get();
        console.log("Patients with accountId = " + userUid + " :", p1.data().count);

        console.log("Let's see if there are patients for accountId = account_" + userUid);
        const p2 = await db.collection('patients').where('accountId', '==', 'account_' + userUid).count().get();
        console.log("Patients with accountId = account_" + userUid + " :", p2.data().count);
    }
}

run().catch(console.error);
