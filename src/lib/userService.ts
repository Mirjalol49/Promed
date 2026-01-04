import { db } from './firebase';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  collection,
  query,
  orderBy,
  getDocs
} from 'firebase/firestore';

export interface UserProfile {
  id: string;
  phone: string;
  full_name?: string;
  account_id?: string;
  profile_image?: string; // string URL
  is_disabled?: boolean;
}

// Map database fields to application fields if necessary
const mapProfile = (id: string, data: any): any => ({
  id: id,
  phone: data.phone,
  email: data.email,
  name: data.full_name,
  accountId: data.account_id,
  // PRIORITIZE avatar_url, fallback to profile_image (legacy)
  profileImage: data.avatar_url || data.profile_image,
  disabled: data.is_disabled,
  lockEnabled: data.lock_enabled !== undefined ? data.lock_enabled : data.lockEnabled,
  lockPassword: data.lock_password || data.lockPassword,
  role: data.role || 'doctor',
  status: data.status || 'active',
  subscriptionStatus: data.subscription_status || 'trial',
  subscriptionEnd: data.subscription_end,

  autoFreezeEnabled: data.auto_freeze_enabled,
  createdAt: data.created_at
});

export const updateUserProfile = async (
  userId: string,
  updates: {
    fullName?: string,
    avatarUrl?: string,
    profileImage?: string,
    password?: string,
    lockEnabled?: boolean,
    lockPassword?: string, // Lock screen password
    status?: 'active' | 'frozen' | 'banned',
    role?: 'admin' | 'doctor' | 'staff',
    subscriptionStatus?: string,
    subscriptionEnd?: string,
    accountId?: string,
    autoFreezeEnabled?: boolean
  }
): Promise<void> => {

  const dbUpdates: any = {
    updated_at: new Date().toISOString(),
  };

  if (updates.fullName) dbUpdates.full_name = updates.fullName;
  if (updates.accountId) dbUpdates.account_id = updates.accountId;
  if (updates.lockEnabled !== undefined) dbUpdates.lock_enabled = updates.lockEnabled;
  if (updates.lockPassword) dbUpdates.lock_password = updates.lockPassword;
  if (updates.status) dbUpdates.status = updates.status;
  if (updates.role) dbUpdates.role = updates.role;
  if (updates.subscriptionStatus) dbUpdates.subscription_status = updates.subscriptionStatus;
  if (updates.subscriptionEnd) dbUpdates.subscription_end = updates.subscriptionEnd;

  if (updates.autoFreezeEnabled !== undefined) dbUpdates.auto_freeze_enabled = updates.autoFreezeEnabled;

  // Robust Image Handling: Write to BOTH columns to ensure persistence across schema versions
  const imageUrl = updates.avatarUrl || updates.profileImage;
  if (imageUrl) {
    dbUpdates.avatar_url = imageUrl;
    dbUpdates.profile_image = imageUrl;
  }

  try {
    const docRef = doc(db, "profiles", userId);
    // setDoc with merge: true will create if not exists, or update if exists
    await setDoc(docRef, dbUpdates, { merge: true });
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
};

export const subscribeToUserProfile = (
  userId: string,
  onUpdate: (user: any) => void,
  onError?: (error: any) => void
) => {
  if (!userId) return () => { };

  const docRef = doc(db, "profiles", userId);

  let unsub: (() => void) | null = null;
  let isUnsubscribed = false;

  try {
    const unsubscribeFn = onSnapshot(docRef, (docSnap) => {
      if (isUnsubscribed) return;
      if (docSnap.exists()) {
        onUpdate(mapProfile(docSnap.id, docSnap.data()));
      } else {
        console.log("No profile found for user:", userId);
      }
    }, (error) => {
      if (isUnsubscribed) return;
      console.error("Profile subscription error:", error);
      if (onError) onError(error);
    });

    unsub = unsubscribeFn;
  } catch (e) {
    if (onError) onError(e);
  }

  return () => {
    isUnsubscribed = true;
    if (unsub) {
      unsub();
      unsub = null;
    }
  };
};

/**
 * Super Admin: Subscribe to all profiles in the system
 */
export const subscribeToAllProfiles = (
  onUpdate: (profiles: any[]) => void,
  onError?: (error: any) => void
) => {
  // Use a safe query that doesn't rely on complex ordering if it causes issues,
  // or ensure we handle the snapshot safely.
  // For now, keeping the query but adding cleanup safety.
  const q = query(
    collection(db, "profiles"),
    orderBy("created_at", "desc")
  );

  let unsub: (() => void) | null = null;
  let isUnsubscribed = false;

  try {
    const unsubscribeFn = onSnapshot(q, (snapshot) => {
      if (isUnsubscribed) return;

      const profiles = snapshot.docs.map(doc => mapProfile(doc.id, doc.data()));
      onUpdate(profiles);
    }, (error) => {
      if (isUnsubscribed) return;
      console.error("All profiles subscription error:", error);
      if (onError) onError(error);
    });

    unsub = unsubscribeFn;
  } catch (err) {
    console.error("Failed to start subscription:", err);
    if (onError) onError(err);
  }

  return () => {
    isUnsubscribed = true;
    if (unsub) {
      unsub();
      unsub = null;
    }
  };
};

