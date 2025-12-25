import { supabase } from './supabaseClient';

// Global cache to hold optimistic blob URLs and prevent flickering during sync
// Map<OptimisticId, BlobUrl>
export const optimisticImageCache = new Map<string, string>();

export const setOptimisticImage = (id: string, url: string) => {
  optimisticImageCache.set(id, url);
};

export const getOptimisticImage = (id: string) => {
  return optimisticImageCache.get(id);
};

export const clearOptimisticImage = (id: string) => {
  optimisticImageCache.delete(id);
};

export const uploadImage = async (file: File, path: string): Promise<string> => {
  if (!file) throw new Error('No file provided');

  // Ensure unique filename to prevent overwrites or browser caching issues
  // Note: path usually includes patientId and category. We append timestamp.
  const uniquePath = `${path}_${Date.now()}`;

  console.log(`🚀 Uploading image to: ${uniquePath}...`);

  const { data, error } = await supabase.storage
    .from('promed-images')
    .upload(uniquePath, file, {
      upsert: true,
      cacheControl: '3600'
    });

  if (error) {
    console.error('❌ Error uploading image:', error);
    throw error;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('promed-images')
    .getPublicUrl(data.path);

  console.log('✅ Image uploaded successfully:', publicUrl);
  return publicUrl;
};

// Start of New Avatar Logic
export const uploadAvatar = async (file: File, userId: string): Promise<string> => {
  if (!file) throw new Error('No file provided');
  if (!userId) throw new Error('User ID is required for avatar upload');

  const fileExt = file.name.split('.').pop();
  const filePath = `${userId}/avatar.${fileExt}`; // Fixed path per user!

  // UPSERT (Overwrite)
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, { upsert: true });

  if (uploadError) {
    console.error('Error uploading avatar:', uploadError);
    throw uploadError;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath);

  // Append timestamp for cache busting
  return `${publicUrl}?t=${new Date().getTime()}`;
}
// End of New Avatar Logic

// Storage Cleanup Logic
export const deleteStorageFiles = async (bucket: string, paths: string[]): Promise<void> => {
  if (!paths || paths.length === 0) return;

  const { error } = await supabase.storage
    .from(bucket)
    .remove(paths);

  if (error) {
    console.error(`Error deleting files from ${bucket}:`, error);
    // We don't necessarily want to throw here as the DB record is already gone,
    // but we log it for debugging.
  }
};

/**
 * Extracts the relative storage path from a Supabase public URL.
 * Example: https://.../storage/v1/object/public/promed-images/patients/123/profile_167.jpg
 * Returns: patients/123/profile_167.jpg
 */
export const extractPathFromUrl = (url: string, bucket: string): string | null => {
  if (!url || !url.includes(bucket)) return null;

  try {
    // Split by bucket name and take the part after it
    // Handle cases where the URL might have query parameters (cache busting)
    const cleanUrl = url.split('?')[0];
    const parts = cleanUrl.split(`${bucket}/`);
    if (parts.length > 1) {
      return parts[1];
    }
  } catch (e) {
    console.error('Error extracting path from URL:', e);
  }
  return null;
};

export const isBase64 = (str: string): boolean => {
  return str?.startsWith('data:');
};
