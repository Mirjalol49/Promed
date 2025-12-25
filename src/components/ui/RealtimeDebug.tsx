import { useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

/**
 * RealtimeDebug Component
 * 
 * This component subscribes to all changes on the 'patients' table
 * and logs them to the console to verify if Supabase realtime is working.
 * 
 * Usage: Import and render inside App.tsx temporarily:
 * <RealtimeDebug />
 */
export default function RealtimeDebug() {
    useEffect(() => {
        console.log('%c [REALTIME DEBUG] Initializing...', 'background: #4a90e2; color: white; padding: 4px; font-weight: bold');

        const channel = supabase
            .channel('debug_room')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'patients' },
                (payload) => {
                    console.log('%c [REALTIME EVENT RECEIVED]', 'background: #222; color: #bada55', payload);
                    console.log('Event Type:', payload.eventType);
                    console.log('Table:', payload.table);
                    console.log('New Record:', payload.new);
                    console.log('Old Record:', payload.old);
                }
            )
            .subscribe((status) => {
                console.log('%c [REALTIME STATUS]', 'color: cyan; font-weight: bold', status);

                if (status === 'SUBSCRIBED') {
                    console.log('%c [REALTIME DEBUG] ✓ Successfully subscribed to patients table', 'background: #28a745; color: white; padding: 4px; font-weight: bold');
                } else if (status === 'CHANNEL_ERROR') {
                    console.error('%c [REALTIME DEBUG] ✗ Channel error occurred', 'background: #dc3545; color: white; padding: 4px; font-weight: bold');
                } else if (status === 'TIMED_OUT') {
                    console.error('%c [REALTIME DEBUG] ✗ Connection timed out', 'background: #dc3545; color: white; padding: 4px; font-weight: bold');
                }
            });

        return () => {
            console.log('%c [REALTIME DEBUG] Cleaning up subscription...', 'background: #ff6b6b; color: white; padding: 4px; font-weight: bold');
            supabase.removeChannel(channel);
        };
    }, []);

    return (
        <div className="fixed bottom-4 right-4 bg-gray-900 text-green-400 px-4 py-2 rounded-lg shadow-lg text-xs font-mono z-50 border border-green-500">
            🟢 Realtime Debug Active (Check Console)
        </div>
    );
}
