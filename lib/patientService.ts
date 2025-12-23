import { supabase } from './supabaseClient';
import { Patient, Injection, PatientImage } from '../types';
import { deleteStorageFiles, extractPathFromUrl } from './imageService';

// Column sets for different query scenarios
export const COLUMNS = {
  // Minimal - for dashboard stats (smallest payload)
  MINIMAL: 'id,full_name,status,operation_date',
  // List view - ALL patient data (FIXED: added age, gender, grafts, technique, injections)
  LIST: 'id,full_name,age,gender,phone,email,status,grafts,technique,profile_image,before_image,after_images,injections,operation_date',
  // Detail view - full patient data
  FULL: '*'
} as const;

// Helper to map DB snake_case to app camelCase
const mapPatient = (p: any): Patient => ({
  id: p.id,
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
  columns: string = COLUMNS.LIST // Default to list view columns
) => {
  if (!accountId) {
    console.warn("⚠️ subscribeToPatients: No accountId provided. Multi-tenancy blocked.");
    return () => { };
  }

  console.log("📂 Subscribing to patients for Account:", accountId);

  // Initial fetch
  supabase
    .from('patients')
    .select(columns)
    .eq('account_id', accountId)
    .then(({ data, error }) => {
      if (error) onError?.(error);
      else if (data) onUpdate(data.map(mapPatient));
    });

  const subscription = supabase
    .channel(`public:patients:account_id=eq.${accountId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'patients'
      },
      () => {
        // Refresh all data on change for simplicity
        supabase
          .from('patients')
          .select(columns)
          .eq('account_id', accountId)
          .then(({ data }) => {
            if (data) onUpdate(data.map(mapPatient));
          });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
};

export const addPatient = async (
  patient: Omit<Patient, 'id'>,
  accountId?: string // Made optional as backend trigger now handles this
): Promise<string> => {
  const dbPatient = {
    // If accountId is provided, use it (though trigger will overwrite it for security).
    // If not, we rely on the trigger.
    // However, if we don't send it, and the DB column is NOT NULL, it might error BEFORE trigger if we don't treat it right?
    // Postgres triggers BEFORE INSERT can supply values for NOT NULL columns.
    ...(accountId ? { account_id: accountId } : {}),
    full_name: patient.fullName,
    age: patient.age,
    gender: patient.gender,
    phone: patient.phone,
    email: patient.email,
    operation_date: patient.operationDate,
    profile_image: patient.profileImage,
    before_image: patient.beforeImage,
    after_images: patient.afterImages,
    injections: patient.injections,
    status: patient.status,
    grafts: patient.grafts,
    technique: patient.technique,
  };

  const { data, error } = await supabase
    .from('patients')
    .insert(dbPatient)
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
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

  const { error } = await supabase
    .from('patients')
    .update(dbUpdates)
    .eq('id', patientId);

  if (error) throw error;
};

export const deletePatient = async (patientId: string): Promise<void> => {
  // 1. Fetch patient to get image URLs before deleting
  const { data: patient, error: fetchError } = await supabase
    .from('patients')
    .select('profile_image, before_image, after_images')
    .eq('id', patientId)
    .single();

  if (fetchError) {
    console.error('Error fetching patient for cleanup:', fetchError);
    // Continue with deletion even if fetch fails, but we won't be able to cleanup storage
  }

  // 2. Delete the DB record
  const { error: deleteError } = await supabase
    .from('patients')
    .delete()
    .eq('id', patientId);

  if (deleteError) throw deleteError;

  // 3. Cleanup storage if patient record was found
  if (patient) {
    const bucket = 'promed-images';
    const pathsToDelete: string[] = [];

    // Extract paths from URLs
    const profilePath = extractPathFromUrl(patient.profile_image, bucket);
    if (profilePath) pathsToDelete.push(profilePath);

    const beforePath = extractPathFromUrl(patient.before_image, bucket);
    if (beforePath) pathsToDelete.push(beforePath);

    if (Array.isArray(patient.after_images)) {
      patient.after_images.forEach((img: PatientImage) => {
        const path = extractPathFromUrl(img.url, bucket);
        if (path) pathsToDelete.push(path);
      });
    }

    if (pathsToDelete.length > 0) {
      console.log(`Cleaning up ${pathsToDelete.length} storage files for patient ${patientId}`);
      await deleteStorageFiles(bucket, pathsToDelete);
    }
  }
};

export const updatePatientInjections = async (
  patientId: string,
  injections: Injection[],
  accountId: string
): Promise<void> => {
  const { error } = await supabase
    .from('patients')
    .update({ injections: injections })
    .eq('id', patientId);

  if (error) throw error;
};

export const addPatientAfterImage = async (
  patientId: string,
  image: PatientImage,
  currentImages: PatientImage[],
  accountId: string
): Promise<void> => {
  const newImages = [image, ...currentImages];
  const { error } = await supabase
    .from('patients')
    .update({ after_images: newImages })
    .eq('id', patientId);

  if (error) throw error;
};
