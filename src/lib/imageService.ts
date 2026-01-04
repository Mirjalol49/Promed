import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

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

  // Firebase Storage paths usually shouldn't have leading slashes for subfolders if strictly following refs
  // Ensure unique filename
  const uniquePath = `${path}_${Date.now()}`;

  console.log(`🚀 Uploading image to: ${uniquePath}...`);

  try {
    const storageRef = ref(storage, uniquePath);
    // Add metadata for caching if needed
    const metadata = {
      cacheControl: 'public,max-age=3600',
      contentType: file.type
    };

    const snapshot = await uploadBytes(storageRef, file, metadata);
    const publicUrl = await getDownloadURL(snapshot.ref);

    console.log('✅ Image uploaded successfully:', publicUrl);
    return publicUrl;
  } catch (error) {
    console.error('❌ Error uploading image:', error);
    throw error;
  }
};

// Start of New Avatar Logic
export const uploadAvatar = async (file: File, userId: string): Promise<string> => {
  if (!file) throw new Error('No file provided');
  if (!userId) throw new Error('User ID is required for avatar upload');

  const fileExt = file.name.split('.').pop();
  const filePath = `avatars/${userId}/avatar.${fileExt}`; // Fixed path per user!

  try {
    const storageRef = ref(storage, filePath);
    const snapshot = await uploadBytes(storageRef, file);
    const publicUrl = await getDownloadURL(snapshot.ref);

    // Append timestamp for cache busting
    return `${publicUrl}?t=${new Date().getTime()}`;
  } catch (uploadError) {
    console.error('Error uploading avatar:', uploadError);
    throw uploadError;
  }
}
// End of New Avatar Logic

// Storage Cleanup Logic
export const deleteStorageFiles = async (bucket: string, paths: string[]): Promise<void> => {
  if (!paths || paths.length === 0) return;

  // Bucket name is implicitly handled by the firebase config usually, 
  // but if multiple buckets, we might need to handle 'bucket' arg.
  // Assuming 'promed-images' maps to default bucket or we just use 'paths' relative to root.
  // Firebase client SDK works with references.

  const deletePromises = paths.map(async (path) => {
    try {
      // If the path was extracted from a URL, it might be URL-encoded? 
      // extractPathFromUrl should handle decoding.
      const fileRef = ref(storage, path);
      await deleteObject(fileRef);
      console.log(`Deleted file: ${path}`);
    } catch (error: any) {
      // If object not found, ignore
      if (error.code === 'storage/object-not-found') {
        console.warn(`File not found, skipping delete: ${path}`);
      } else {
        console.error(`Error deleting file ${path}:`, error);
      }
    }
  });

  await Promise.all(deletePromises);
};

/**
 * Extracts the relative storage path from a Firebase Storage public URL.
 * Example: https://firebasestorage.googleapis.com/v0/b/project-id.appspot.com/o/folder%2Ffile.jpg?alt=media&token=...
 * Returns: folder/file.jpg
 */
export const extractPathFromUrl = (url: string, bucket?: string): string | null => {
  if (!url) return null;
  // Supabase legacy check or just robust check
  if (url.includes('firebasestorage')) {
    try {
      // Extract everything between /o/ and ?
      const parts = url.split('/o/');
      if (parts.length < 2) return null;

      const pathWithParams = parts[1];
      const pathEncoded = pathWithParams.split('?')[0];

      return decodeURIComponent(pathEncoded);
    } catch (e) {
      console.error('Error extracting path from Firebase URL:', e);
      return null;
    }
  }

  // Backwards compatibility for Supabase URLs if needed during migration?
  // If we still have old data on page load, we might trip here if we try to delete it.
  // But for now, user asked to Migrate.
  return null;
};

export const isBase64 = (str: string): boolean => {
  return str?.startsWith('data:');
};
