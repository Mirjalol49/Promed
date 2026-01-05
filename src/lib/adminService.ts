import { initializeApp, getApp, getApps, FirebaseApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, updateProfile, signOut, signInWithEmailAndPassword, UserCredential } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, getDocs, serverTimestamp, initializeFirestore } from 'firebase/firestore';

// Main DB instance (imported from your main file ideally, but getting fresh here is fine for admin ops)
// Actually, for writing to 'users' collection, we can use the main app's DB. 
// But for *Auth*, we need a secondary app.
import { firebaseConfig, db as mainDb } from './firebase';

export const createSystemUser = async (data: {
    email: string;
    fullName: string;
    role: 'admin' | 'doctor' | 'staff' | 'user';
    password: string;
}) => {
    let secondaryApp: FirebaseApp | null = null;

    try {
        // 1. Initialize a secondary app to create user without kicking out current admin
        const appName = 'secondaryApp-' + new Date().getTime();
        secondaryApp = initializeApp(firebaseConfig, appName);
        const secondaryAuth = getAuth(secondaryApp);

        // 2. Try to create the user in Auth
        console.log("Attempting to create user in Auth...");
        let userCredential: UserCredential;

        try {
            userCredential = await createUserWithEmailAndPassword(secondaryAuth, data.email, data.password);
        } catch (authError: any) {
            if (authError.code === 'auth/email-already-in-use') {
                console.log("Email in use, attempting to 'heal' by signing in...");
                // If it already exists, try to sign in to get the UID. 
                // This ensures we can recover if Firestore save failed earlier.
                userCredential = await signInWithEmailAndPassword(secondaryAuth, data.email, data.password);
                console.log("Legacy account verified and claimed.");
            } else {
                throw authError;
            }
        }

        const user = userCredential.user;

        // 3. Update their profile (Name)
        await updateProfile(user, {
            displayName: data.fullName
        });

        // 4. Store user details in Firestore 'profiles' collection
        // We use the MAIN db for this, so the main app can read it easily.
        console.log("Saving profile to Firestore...");
        await setDoc(doc(mainDb, 'profiles', user.uid), {
            id: user.uid,
            email: data.email,
            full_name: data.fullName, // Correctly mapped
            fullName: data.fullName,   // Add both casing styles to be safe
            role: data.role,
            created_at: serverTimestamp(),
            status: 'active',
            avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.fullName)}&background=random`,
            is_disabled: false,
            lock_password: data.password,
            lock_enabled: true
        });

        // 5. Sign out the secondary auth so it doesn't linger
        await signOut(secondaryAuth);

        console.log("User created successfully!");
        return { success: true, uid: user.uid };

    } catch (error: any) {
        console.error("Error creating user:", error);
        throw new Error(error.message);
    } finally {
        // 6. Cleanup the secondary app
        if (secondaryApp) {
            await deleteApp(secondaryApp);
        }
    }
};

export const getAllUsers = async () => {
    try {
        const querySnapshot = await getDocs(collection(mainDb, 'profiles'));
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching users:", error);
        return [];
    }
};
