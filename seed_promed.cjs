
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, setDoc, serverTimestamp, initializeFirestore } = require('firebase/firestore');

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
const auth = getAuth(app);
// Use the new 'promed' database
const db = initializeFirestore(app, {}, "promed");

async function seedAdmin() {
    console.log("🌱 Seeding Admin to 'promed' database...");

    const email = "mirjalolreactjs@gmail.com";
    const password = "mirjalol4941";
    let user = null;

    try {
        console.log(`Attempting to create/login ${email}...`);

        try {
            // Try creating first
            const credential = await createUserWithEmailAndPassword(auth, email, password);
            user = credential.user;
            console.log("✅ User created successfully!");
        } catch (createError) {
            if (createError.code === 'auth/email-already-in-use') {
                console.log("User exists. Signing in...");
                try {
                    const credential = await signInWithEmailAndPassword(auth, email, password);
                    user = credential.user;
                    console.log("✅ Signed in successfully!");
                } catch (loginError) {
                    console.error(`❌ Login failed for ${email}:`, loginError.code);
                    console.log("⚠️ Attempting to create BACKUP ADMIN (admin@graft.com)...");

                    try {
                        const backupCred = await createUserWithEmailAndPassword(auth, "admin@graft.com", "promed2025");
                        user = backupCred.user;
                        console.log("✅ BACKUP Admin created: admin@graft.com / promed2025");
                    } catch (backupError) {
                        if (backupError.code === 'auth/email-already-in-use') {
                            const backupCred = await signInWithEmailAndPassword(auth, "admin@graft.com", "promed2025");
                            user = backupCred.user;
                            console.log("✅ Signed in as BACKUP Admin.");
                        } else {
                            throw backupError;
                        }
                    }
                }
            } else {
                throw createError;
            }
        }

        if (!user) throw new Error("Could not authenticate any user.");

        console.log(`Writing profile for UID: ${user.uid} to 'promed' db...`);

        await setDoc(doc(db, 'profiles', user.uid), {
            id: user.uid,
            email: user.email,
            full_name: "Super Admin",
            role: "admin",
            status: "active",
            created_at: serverTimestamp(),
            updated_at: serverTimestamp(),
            avatar_url: "https://ui-avatars.com/api/?name=Super+Admin&background=0D8ABC&color=fff",
            profile_image: "https://ui-avatars.com/api/?name=Super+Admin&background=0D8ABC&color=fff",
            is_disabled: false,
            account_id: user.uid
        });

        console.log("✅ Admin profile successfully created in 'promed'!");
        process.exit(0);

    } catch (error) {
        console.error("❌ FAILURE:", error.message);
        if (error.code === 'permission-denied' || error.message.includes('permission-denied')) {
            console.log("\n⚠️  ACCESS DENIED: The 'promed' database is blocking writes.");
            console.log("👉 ACTION REQUIRED: Go to Firebase Console -> Firestore -> Rules.");
            console.log("   Change 'allow read, write: if false;' to 'allow read, write: if request.auth != null;' temporarily.");
        }
        process.exit(1);
    }
}

seedAdmin();
