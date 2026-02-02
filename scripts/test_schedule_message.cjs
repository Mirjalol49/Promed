
const admin = require("firebase-admin");

// Connect to Emulator
process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "localhost:9099";

admin.initializeApp({ projectId: "promed-2" });

const db = admin.firestore();

async function testSchedule() {
    console.log("🚀 Creating Scheduled Message Task...");

    const scheduledDate = new Date(Date.now() + 65 * 1000); // 65 seconds from now

    try {
        const docRef = await db.collection('outbound_messages').add({
            telegramChatId: "1907166652", // User ID from allowed list
            text: "🔔 This is a TEST scheduled message from script!",
            status: "PENDING",
            patientName: "Test Script",
            action: "SEND",
            createdAt: new Date().toISOString(),
            scheduledFor: scheduledDate.toISOString()
        });

        console.log(`✅ Document created with ID: ${docRef.id}`);
        console.log(`📅 Scheduled For: ${scheduledDate.toISOString()}`);
    } catch (e) {
        console.error("Error:", e);
    }
}

testSchedule();
