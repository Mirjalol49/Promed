import fs from 'fs';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfigStr = fs.readFileSync('src/lib/firebase.ts', 'utf8');
function extractConfig(str) {
    const match = str.match(/const firebaseConfig = ({[\s\S]*?});/);
    if (match) {
        return eval('(' + match[1] + ')');
    }
    return null;
}
const firebaseConfig = extractConfig(firebaseConfigStr);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
    const querySnapshot = await getDocs(collection(db, "staff"));
    console.log(`Total Staff: ${querySnapshot.size}`);
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`| Name: ${data.fullName} | Role: ${data.role} | ID: ${doc.id}`);
    });
}
run().catch(console.error);
