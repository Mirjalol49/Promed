
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, set } = require('firebase/database');

const firebaseConfig = {
    apiKey: "AIzaSyA5bBbxNXgkf3f4Xo7R6-QX2VtmS9sju5A",
    authDomain: "graft-24962.firebaseapp.com",
    projectId: "graft-24962",
    storageBucket: "graft-24962.firebasestorage.app",
    messagingSenderId: "316617635904",
    appId: "1:316617635904:web:b7b660eea96ec9072387a5",
    measurementId: "G-45KMKL3YLR",
    databaseURL: "https://graft-24962-default-rtdb.firebaseio.com" // Guessed from typical pattern or user provided? 
    // User provided screenshot: https://graft-24962-default-rtdb.firebaseio.com
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

async function testRTDB() {
    console.log("Testing Realtime Database...");
    try {
        await set(ref(db, 'test_connection'), {
            status: 'online',
            timestamp: Date.now()
        });
        console.log("✅ SUCCESS: Written to Realtime Database!");
        process.exit(0);
    } catch (error) {
        console.error("❌ FAILURE: RTDB Write failed:", error.message);
        process.exit(1);
    }
}

testRTDB();
