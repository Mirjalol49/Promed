import { initializeApp, getApp, getApps, FirebaseApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, updateProfile, signOut, signInWithEmailAndPassword, UserCredential } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, getDocs, serverTimestamp, initializeFirestore } from 'firebase/firestore';

// Main DB instance (imported from your main file ideally, but getting fresh here is fine for admin ops)
// Actually, for writing to 'users' collection, we can use the main app's DB. 
// But for *Auth*, we need a secondary app.
import { firebaseConfig, db as mainDb } from './firebase';

export const createSystemUser = async (data: {
    email: string;
    phoneNumber?: string; // Optional for now to keep back-compat
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
                console.error("Duplicate phone usage detected.");
                throw new Error("ACCOUNT_EXISTS: This phone number is already registered to another active clinic or user. You must use a unique phone number for each new System Node.");
            } else {
                throw authError;
            }
        }

        const user = userCredential.user;

        // 3. Update their profile (Name)
        await updateProfile(user, {
            displayName: data.fullName
        });

        // 4. Store user details in Firestore 'profiles' collection (and 'users' collection for lookup)
        // We use the MAIN db for this, so the main app can read it easily.
        console.log("Saving profile to Firestore...");

        // Save to 'profiles' (Visual Profile)
        await setDoc(doc(mainDb, 'profiles', user.uid), {
            id: user.uid,
            email: data.email,
            phoneNumber: data.phoneNumber || '',
            full_name: data.fullName, // Correctly mapped
            fullName: data.fullName,   // Add both casing styles to be safe
            role: data.role,
            created_at: serverTimestamp(),
            status: 'active',
            avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.fullName)}&background=random`,
            is_disabled: false,
            lock_password: data.password,
            lock_enabled: true,
            account_id: user.uid,
            accountId: user.uid
        });

        // Create clean phone number by removing spaces
        const cleanPhone = data.phoneNumber ? data.phoneNumber.replace(/\s+/g, '') : '';

        // Save to 'users' (System Lookup for Login)
        // We duplicates some data here because 'requestOtp' queries 'users' collection
        await setDoc(doc(mainDb, 'users', user.uid), {
            uid: user.uid,
            phoneNumber: cleanPhone,
            email: data.email,
            role: data.role,
            telegramChatId: null // Pending link
        });

        // 5. Sign out the secondary auth so it doesn't linger

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
