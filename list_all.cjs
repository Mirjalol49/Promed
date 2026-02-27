const admin = require("firebase-admin");

// Fetch the service account key JSON file contents
var serviceAccount = require("./profs2.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function run() {
    const p = await db.collection("profiles").get();
    p.forEach(d => {
        console.log("Email:", d.data().email, "Role: ", d.data().role, "account_id:", d.data().account_id);
    });
}
run();
