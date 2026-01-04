import { db } from './firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs
} from 'firebase/firestore';
import { Patient, Injection, PatientImage } from '../types';
import { deleteStorageFiles, extractPathFromUrl } from './imageService';

// No specific columns needed for Firestore as it's NoSQL (always fetches full doc usually, or we filter client-side if needed)
export const COLUMNS = {
  MINIMAL: 'minimal',
  LIST: 'list',
  FULL: 'full'
} as const;

// FIX: Idempotency Cache to prevent double submissions (e.g. React Strict Mode or Race Conditions)
const recentAdds = new Map<string, { id: string, time: number }>();

// Helper to map Firestore data to app Patient type
const mapPatient = (id: string, p: any): Patient => ({
  id: id,
  fullName: p.full_name,
  age: p.age,
  gender: p.gender,
  phone: p.phone,
  email: p.email,
  operationDate: p.operation_date,
  profileImage: p.profile_image,
  beforeImage: p.before_image,
  afterImages: p.after_images || [],
  injections: p.injections || [],
  status: p.status,
  grafts: p.grafts,
  technique: p.technique,
});

export const subscribeToPatients = (
  accountId: string,
  onUpdate: (patients: Patient[]) => void,
  onError?: (error: any) => void,
  columns: string = COLUMNS.LIST // Unused in Firestore adaptation but kept for signature compatibility
) => {
  if (!accountId) {
    console.warn("⚠️ subscribeToPatients: No accountId provided.");
    return () => { };
  }

  console.log("📂 Subscribing to patients for Account:", accountId);

  const q = query(
    collection(db, "patients"),
    where("account_id", "==", accountId)
  );

  let unsub: (() => void) | null = null;
  let isUnsubscribed = false;

  try {
    const unsubscribeFn = onSnapshot(q, (snapshot) => {
      if (isUnsubscribed) return;
      const patients = snapshot.docs.map(doc => mapPatient(doc.id, doc.data()));
      onUpdate(patients);
    }, (error) => {
      if (isUnsubscribed) return;
      console.error("Firebase subscription error:", error);
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

export const addPatient = async (
  patient: Omit<Patient, 'id'>,
  userId: string, // Kept for auth validation context if needed
  accountId?: string
): Promise<string> => {
  // 1. Idempotency Check
  const activeAccountId = accountId || userId;
  const key = `${activeAccountId}-${patient.fullName}-${patient.phone}`;
  const now = Date.now();

  // Cleanup old cache entries (> 5 seconds)
  for (const [k, v] of recentAdds.entries()) {
    if (now - v.time > 5000) recentAdds.delete(k);
  }

  if (recentAdds.has(key)) {
    console.warn("⚠️ Duplicate Save Prevented (Idempotency):", key);
    return recentAdds.get(key)!.id;
  }

  const dbPatient: any = {
    account_id: accountId || userId,
    user_id: userId || null,
    full_name: patient.fullName || '',
    age: patient.age ?? null,
    gender: patient.gender || 'male',
    phone: patient.phone || '',
    email: patient.email ?? null,
    operation_date: patient.operationDate || new Date().toISOString(),
    profile_image: patient.profileImage ?? null,
    before_image: patient.beforeImage ?? null,
    after_images: patient.afterImages || [],
    injections: patient.injections || [],
    status: patient.status || 'Active',
    grafts: patient.grafts ?? null,
    technique: patient.technique ?? null,
    created_at: new Date().toISOString()
  };

  console.log("💾 DB INSERT START:", { account_id: dbPatient.account_id, full_name: dbPatient.full_name });

  try {
    const docRef = await addDoc(collection(db, "patients"), dbPatient);
    console.log("🟢 DB INSERT SUCCESS, ID:", docRef.id);

    // Store in cache
    recentAdds.set(key, { id: docRef.id, time: Date.now() });

    return docRef.id;
  } catch (error: any) {
    console.error('🔴 DB INSERT ERROR:', error);
    throw error;
  }
};

export const updatePatient = async (
  patientId: string,
  updates: Partial<Patient>,
  accountId: string // Kept for interface compatibility
): Promise<void> => {
  const dbUpdates: any = {};
  if (updates.fullName) dbUpdates.full_name = updates.fullName;
  if (updates.age) dbUpdates.age = updates.age;
  if (updates.gender) dbUpdates.gender = updates.gender;
  if (updates.phone) dbUpdates.phone = updates.phone;
  if (updates.email) dbUpdates.email = updates.email;
  if (updates.operationDate) dbUpdates.operation_date = updates.operationDate;
  if (updates.profileImage) dbUpdates.profile_image = updates.profileImage;
  if (updates.beforeImage) dbUpdates.before_image = updates.beforeImage;
  if (updates.afterImages) dbUpdates.after_images = updates.afterImages;
  if (updates.injections) dbUpdates.injections = updates.injections;
  if (updates.status) dbUpdates.status = updates.status;
  if (updates.grafts) dbUpdates.grafts = updates.grafts;
  if (updates.technique) dbUpdates.technique = updates.technique;

  dbUpdates.updated_at = new Date().toISOString();

  const docRef = doc(db, "patients", patientId);
  await updateDoc(docRef, dbUpdates);
};

export const deletePatient = async (patientId: string): Promise<void> => {
  const docRef = doc(db, "patients", patientId);

  // 1. Fetch patient in background for image cleanup (Non-blocking for the hard delete)
  getDoc(docRef).then(async (docSnap) => {
    const patientData = docSnap.data();
    if (patientData) {
      const pathsToDelete: string[] = [];
      if (patientData.profile_image) {
        const path = extractPathFromUrl(patientData.profile_image);
        if (path) pathsToDelete.push(path);
      }
      if (patientData.before_image) {
        const path = extractPathFromUrl(patientData.before_image);
        if (path) pathsToDelete.push(path);
      }
      if (Array.isArray(patientData.after_images)) {
        patientData.after_images.forEach((img: any) => {
          const path = extractPathFromUrl(img.url);
          if (path) pathsToDelete.push(path);
        });
      }
      if (pathsToDelete.length > 0) {
        await deleteStorageFiles('', pathsToDelete).catch(e => console.warn("Cleanup error:", e));
      }
    }
  }).catch(e => console.warn("Metadata fetch for cleanup failed:", e));

  // 2. THE HARD DELETE: Delete the DB record strictly
  await deleteDoc(docRef);
  console.log(`✅ Hard delete executed for patient: ${patientId}`);
};

export const updatePatientInjections = async (
  patientId: string,
  injections: Injection[],
  accountId: string
): Promise<void> => {
  const docRef = doc(db, "patients", patientId);
  await updateDoc(docRef, {
    injections: injections,
    updated_at: new Date().toISOString()
  });
};

export const addPatientAfterImage = async (
  patientId: string,
  image: PatientImage,
  currentImages: PatientImage[],
  accountId: string
): Promise<void> => {
  const newImages = [image, ...currentImages];
  const docRef = doc(db, "patients", patientId);
  await updateDoc(docRef, {
    after_images: newImages,
    updated_at: new Date().toISOString()
  });
};

export const deletePatientAfterImage = async (
  patientId: string,
  photoId: string,
  currentImages: PatientImage[]
): Promise<void> => {
  const imageToDelete = currentImages.find(img => img.id === photoId);
  const newImages = currentImages.filter(img => img.id !== photoId);

  // 1. Update DB
  const docRef = doc(db, "patients", patientId);
  await updateDoc(docRef, {
    after_images: newImages,
    updated_at: new Date().toISOString()
  });

  // 2. Cleanup Storage (Background)
  if (imageToDelete) {
    try {
      // Import extractPathFromUrl from imageService if needed
      const { extractPathFromUrl, deleteStorageFiles } = await import('./imageService');
      const path = extractPathFromUrl(imageToDelete.url);
      if (path) {
        deleteStorageFiles('', [path]);
      }
    } catch (e) {
      console.warn("Error deleting image file:", e);
    }
  }
};
