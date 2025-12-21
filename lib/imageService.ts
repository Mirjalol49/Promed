import { supabase } from './supabaseClient';

export const uploadImage = async (file: File, path: string): Promise<string> => {
  if (!file) throw new Error('No file provided');

  // Ensure unique filename to prevent overwrites or browser caching issues
  const uniquePath = `${path}_${Date.now()}`;

  const { data, error } = await supabase.storage
    .from('promed-images')
    .upload(uniquePath, file);

  if (error) {
    console.error('Error uploading image:', error);
    throw error;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('promed-images')
    .getPublicUrl(data.path);

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

export const isBase64 = (str: string): boolean => {
  return str?.startsWith('data:');
};
