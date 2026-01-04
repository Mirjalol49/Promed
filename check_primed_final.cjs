
const { initializeApp } = require('firebase/app');
const { getFirestore, addDoc, collection } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyA5bBbxNXgkf3f4Xo7R6-QX2VtmS9sju5A",
    authDomain: "graft-24962.firebaseapp.com",
    projectId: "graft-24962",
    storageBucket: "graft-24962.firebasestorage.app",
    messagingSenderId: "316617635904",
    appId: "1:316617635904:web:b7b660eea96ec9072387a5",
    measurementId: "G-45KMKL3YLR"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, "primed");

console.log("🚀 Final Test of 'primed' Database...");

addDoc(collection(db, "_system_check"), {
    status: "active",
    verifiedAt: new Date().toISOString()
}).then((ref) => {
    console.log("✅ SUCCESS! 'primed' database is connected and writable. ID:", ref.id);
    process.exit(0);
}).catch((e) => {
    console.error("❌ ERROR with 'primed':", e.message);
    process.exit(1);
});
