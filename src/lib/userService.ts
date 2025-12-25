import { supabase } from './supabaseClient';

export interface UserProfile {
  id: string;
  phone: string;
  full_name?: string;
  account_id?: string;
  profile_image?: string; // string URL
  is_disabled?: boolean;
}

// Map database fields to application fields if necessary
// Map database fields to application fields if necessary
const mapProfile = (data: any): any => ({
  id: data.id,
  phone: data.phone,
  email: data.email,
  name: data.full_name,
  accountId: data.account_id,
  // PRIORITIZE avatar_url, fallback to profile_image (legacy)
  profileImage: data.avatar_url || data.profile_image,
  disabled: data.is_disabled,
  lockEnabled: data.lock_enabled, // Lock screen enabled state
  lockPassword: data.lock_password, // Lock screen password (plaintext)
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

  // 🔥 FIX: Initial fetch
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
        onUpdate(mapProfile(payload.new));
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
};

/**
 * Super Admin: Subscribe to all profiles in the system
 */
export const subscribeToAllProfiles = (
  onUpdate: (profiles: any[]) => void,
  onError?: (error: any) => void
) => {
  // Initial fill
  supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .then(({ data, error }) => {
      if (error) {
        console.error('Error fetching all profiles:', error);
        onError?.(error);
      } else if (data) {
        onUpdate(data.map(mapProfile));
      }
    });

  // Realtime subscription for ALL profiles
  const subscription = supabase
    .channel('admin:all_profiles')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'profiles' },
      () => {
        // Simple strategy: Re-fetch list on any change for consistency
        supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false })
          .then(({ data }) => {
            if (data) onUpdate(data.map(mapProfile));
          });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
};

