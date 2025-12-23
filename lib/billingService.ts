import { supabase } from './supabaseClient';
import { Profile } from '../types';
import { paymeService } from './paymeService';

/**
 * Billing Service
 * Handles subscription health checks and automated actions
 */
export const billingService = {
    /**
     * Checks if a clinic's subscription is valid
     */
    isSubscriptionValid(profile: Profile): boolean {
        if (profile.subscriptionStatus === 'lifetime') return true;
        if (!profile.subscriptionExpiry) return profile.subscriptionStatus === 'trial';

        const expiryDate = new Date(profile.subscriptionExpiry);
        return expiryDate > new Date();
    },

    /**
     * Synchronizes billing status and triggers auto-freeze if necessary
     */
    async checkAndEnforceSubscription(profileId: string) {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', profileId)
            .single();

        if (error || !profile) return;

        const expiryDate = profile.subscription_expiry ? new Date(profile.subscription_expiry) : null;
        const now = new Date();

        // If subscription is expired and account is active, mark as overdue or freeze
        if (expiryDate && expiryDate < now && profile.status === 'active') {
            if (profile.auto_freeze_enabled) {
                await supabase
                    .from('profiles')
                    .update({
                        status: 'frozen',
                        subscription_status: 'overdue'
                    })
                    .eq('id', profileId);
            } else {
                await supabase
                    .from('profiles')
                    .update({
                        subscription_status: 'overdue'
                    })
                    .eq('id', profileId);
            }
        }
    },

    /**
     * Gets billing history for a profile
     */
    async getBillingHistory(profileId: string) {
        const { data, error } = await supabase
            .from('billing_history')
            .select('*')
            .eq('profile_id', profileId)
            .order('created_at', { ascending: false });

        return { data, error };
    }
};
