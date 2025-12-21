import { supabase } from './supabaseClient';

export interface UserProfile {
  id: string;
  phone: string;
  full_name?: string;
  role?: string;
  account_id?: string;
  profile_image?: string; // string URL
  is_disabled?: boolean;
}

// Map database fields to application fields if necessary
const mapProfile = (data: any): any => ({
  id: data.id,
  phone: data.phone,
  name: data.full_name,
  role: data.role,
  accountId: data.account_id,
  // PRIORITIZE avatar_url, fallback to profile_image (legacy)
  profileImage: data.avatar_url || data.profile_image,
  disabled: data.is_disabled,
  lockEnabled: data.lock_enabled, // Lock screen enabled state
  lockPassword: data.lock_password, // Lock screen password (plaintext)
});

/* ... exports ... */

export const updateUserProfile = async (
  userId: string,
  updates: {
    fullName?: string,
    avatarUrl?: string,
    profileImage?: string,
    role?: string,
    password?: string,
    lockEnabled?: boolean,
    lockPassword?: string // Lock screen password
  }
): Promise<void> => {

  const dbUpdates: any = {
    updated_at: new Date().toISOString(),
  };

  if (updates.fullName) dbUpdates.full_name = updates.fullName;
  if (updates.role) dbUpdates.role = updates.role;
  if (updates.lockEnabled !== undefined) dbUpdates.lock_enabled = updates.lockEnabled;
  if (updates.lockPassword) dbUpdates.lock_password = updates.lockPassword;

  // Robust Image Handling: Write to BOTH columns to ensure persistence across schema versions
  const imageUrl = updates.avatarUrl || updates.profileImage;
  if (imageUrl) {
    dbUpdates.avatar_url = imageUrl;
    dbUpdates.profile_image = imageUrl;
  }

  // Update Firestore-like password field if needed (legacy or lock screen sync)
  // Note: We don't save 'password' to profiles table usually, but if your app relies on it:
  // if (updates.password) dbUpdates.password_hash = ... 

  const { error } = await supabase
    .from('profiles')
    .update(dbUpdates)
    .eq('id', userId);

  if (error) {
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

  // 🔥 FIX: Initial fetch (THIS WAS MISSING!)
  supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
    .then(({ data, error }) => {
      if (error) {
        console.error('Initial profile fetch error:', error);
        onError?.(error);
      } else if (data) {
        console.log('✓ Initial profile loaded:', data);
        onUpdate(mapProfile(data));
      }
    });

  // Then subscribe to realtime updates
  const subscription = supabase
    .channel(`public:profiles:id=eq.${userId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
      (payload) => {
        console.log('✓ Profile realtime update received:', payload.new);
        onUpdate(mapProfile(payload.new));
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
};

