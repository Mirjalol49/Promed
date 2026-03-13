import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

// Note: To run this script, you must provide a service account key path
// Example: export GOOGLE_APPLICATION_CREDENTIALS="/path/to/key.json"
// Run: node scripts/stress_test.js

async function initFirebase() {
  if (!admin.apps.length) {
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.warn("⚠️ GOOGLE_APPLICATION_CREDENTIALS not set.");
      console.warn("Please export the path to your Firebase Service Account JSON key.");
      console.warn("Example: export GOOGLE_APPLICATION_CREDENTIALS='./service-account.json'");
      process.exit(1);
    }
    admin.initializeApp({
      credential: admin.credential.applicationDefault()
    });
  }
  return admin.firestore();
}

const TOTAL_USERS = 1000;
const BATCH_SIZE = 100; // Firestore batch limit is 500, but we use 100 to simulate concurrency better
const TARGET_ACCOUNT_ID = 'STRESS_TEST_ACCOUNT_001';

async function runStressTest() {
  console.log(`🚀 Starting Stress Test: Simulating ${TOTAL_USERS} concurrent patient creations...`);
  const db = await initFirebase();
  const startTime = Date.now();

  const patients = [];
  for (let i = 0; i < TOTAL_USERS; i++) {
    patients.push({
      account_id: TARGET_ACCOUNT_ID,
      full_name: `Stress Test Patient ${i}`,
      phone: `+99890${String(i).padStart(7, '0')}`,
      status: 'Active',
      tier: 'regular',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }

  // Create blocks of concurrency
  const chunks = [];
  for (let i = 0; i < patients.length; i += BATCH_SIZE) {
    chunks.push(patients.slice(i, i + BATCH_SIZE));
  }

  console.log(`📦 Prepared ${chunks.length} batches of ${BATCH_SIZE} users.`);

  let successCount = 0;
  let errorCount = 0;

  // We map the chunks to promises to execute them concurrently
  const batchPromises = chunks.map(async (chunk, index) => {
    const batch = db.batch();
    chunk.forEach(patient => {
      const docRef = db.collection('patients').doc();
      batch.set(docRef, patient);
      
      // Also simulate a deposit transaction to trigger Cloud Functions
      const txRef = db.collection('transactions').doc();
      batch.set(txRef, {
        accountId: TARGET_ACCOUNT_ID,
        patientId: docRef.id,
        amount: Math.floor(Math.random() * 500000) + 100000,
        type: 'income',
        category: 'deposit',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().slice(0, 5),
        created_at: new Date().toISOString()
      });
    });

    try {
      await batch.commit();
      successCount += chunk.length;
      console.log(`✅ Batch ${index + 1}/${chunks.length} committed successfully.`);
    } catch (e) {
      errorCount += chunk.length;
      console.error(`❌ Batch ${index + 1} failed:`, e.message);
    }
  });

  await Promise.all(batchPromises);

  const endTime = Date.now();
  const durationInSeconds = (endTime - startTime) / 1000;

  console.log('\n=============================================');
  console.log('🏁 STRESS TEST COMPLETE');
  console.log(`⏱️ Duration: ${durationInSeconds.toFixed(2)} seconds`);
  console.log(`✅ Success: ${successCount} patients + ${successCount} transactions`);
  console.log(`❌ Failed: ${errorCount}`);
  console.log(`📊 Throughput: ${((successCount * 2) / durationInSeconds).toFixed(2)} writes/sec`);
  console.log('=============================================');
  console.log('\nMonitor your Firebase Console (Cloud Functions Logs & Usage) to verify trigger executions and timeouts.');
  process.exit(0);
}

runStressTest().catch(console.error);
