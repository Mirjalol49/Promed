
const { initializeApp } = require("firebase/app");
const { getFirestore, setDoc, doc } = require("firebase/firestore");

const firebaseConfig = {
    projectId: "graft",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testWrite() {
    try {
        console.log("--- Testing 'graft' ---");
        await setDoc(doc(db, "diagnostics", "test"), { ok: true });
        console.log("✅ SUCCESS!");
    } catch (error) {
        console.error("❌ FAILED:", error.code, error.message);
    }
    process.exit(0);
}
testWrite();
