
const { initializeApp } = require("firebase/app");
const { getFirestore, setDoc, doc } = require("firebase/firestore");

const firebaseConfig = {
    projectId: "hair-dash-3e200",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testWrite() {
    try {
        console.log("--- Testing 'hair-dash-3e200' ---");
        await setDoc(doc(db, "diagnostics", "test"), { ok: true });
        console.log("✅ SUCCESS!");
    } catch (error) {
        console.error("❌ FAILED:", error.code, error.message);
    }
    process.exit(0);
}
testWrite();
