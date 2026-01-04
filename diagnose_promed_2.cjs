
const { initializeApp } = require("firebase/app");
const { getFirestore, setDoc, doc } = require("firebase/firestore");

const firebaseConfig = {
    projectId: "promed-2",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testWrite() {
    try {
        console.log("--- Testing 'promed-2' ---");
        await setDoc(doc(db, "diagnostics", "test"), { ok: true });
        console.log("✅ SUCCESS!");
    } catch (error) {
        console.error("❌ FAILED:", error.code, error.message);
    }
    process.exit(0);
}
testWrite();
