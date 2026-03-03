const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function run() {
  const q = await db.collection('outbound_messages').where('status', '==', 'QUEUED').get();
  console.log(`Found ${q.size} QUEUED messages`);
  q.forEach(doc => {
      console.log(doc.id, doc.data());
  });
}
run().catch(console.error);
