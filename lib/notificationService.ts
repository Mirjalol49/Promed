import { supabase } from './supabaseClient';

export interface SystemAlert {
    id: string;
    title: string;
    content: string;
    type: 'info' | 'warning' | 'danger' | 'success';
    is_active: boolean;
    created_at: string;
}

/**
 * Subscribe to the most recent active system alert
 */
export const subscribeToSystemAlerts = (
    onUpdate: (alert: SystemAlert | null) => void,
    onError?: (error: any) => void
) => {
    // Initial fetch of the latest active alert
    supabase
        .from('system_alerts')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .then(({ data, error }) => {
            if (error) {
                console.error('Error fetching system alert:', error);
                onError?.(error);
            } else {
                onUpdate(data && data.length > 0 ? data[0] : null);
            }
        });

    // Realtime subscription
    const subscription = supabase
        .channel('public:system_alerts')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'system_alerts' },
            () => {
                // Re-fetch latest active on any change
                supabase
                    .from('system_alerts')
                    .select('*')
                    .eq('is_active', true)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .then(({ data }) => {
                        onUpdate(data && data.length > 0 ? data[0] : null);
                    });
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(subscription);
    };
};

/**
 * Admin: Broadcast a new message
 */
export const broadcastAlert = async (alert: {
    title: string;
    content: string;
    type: 'info' | 'warning' | 'danger' | 'success';
}): Promise<void> => {
    // First, deactivate all previous alerts (simple one-at-a-time strategy)
    await supabase
        .from('system_alerts')
        .update({ is_active: false })
        .eq('is_active', true);

    // Insert new alert
    const { error } = await supabase.from('system_alerts').insert([
        {
            ...alert,
            is_active: true,
        },
    ]);

    if (error) throw error;
};

/**
 * Admin: Clear current alert
 */
export const clearAlerts = async (): Promise<void> => {
    const { error } = await supabase
        .from('system_alerts')
        .update({ is_active: false })
        .eq('is_active', true);

    if (error) throw error;
};
