import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // 1. Verify Caller Auth
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            throw new Error('Missing Authorization Header');
        }

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        );

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
        if (userError || !user) {
            throw new Error('Unauthorized');
        }

        // 2. Parse Body
        const { userId, disable } = await req.json();
        if (!userId || typeof disable !== 'boolean') {
            throw new Error('Missing userId or disable status');
        }

        console.log(`Toggling user ${userId} to disabled=${disable}`);

        // 3. Admin Client
        const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                },
            }
        );

        // 4. Update Auth User (Ban/Unban)
        // 'ban_duration' is a string formatted as time duration (e.g. "100h") or "none" / 0 to unban.
        // Actually, 'ban_duration' isn't a standard update param in simple `updateUserById` in all versions?
        // Let's check Supabase docs memory... 
        // Ideally we set `ban_duration`. If 'none' or empty, it unbans.
        // If we want to ban indefinitely, we set a long duration.

        // NOTE: supabase-js v2 admin.updateUserById supports 'ban_duration'.
        // Use '876000h' (~100 years) for ban, 'none' for unban.
        const banDuration = disable ? '876000h' : 'none';

        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            ban_duration: banDuration
        });

        if (authError) {
            console.error('Failed to update auth ban status:', authError);
            throw authError;
        }

        // 5. Update Profile
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update({ is_disabled: disable })
            .eq('id', userId);

        if (profileError) {
            console.error('Failed to update profile status:', profileError);
            throw profileError;
        }

        return new Response(
            JSON.stringify({ success: true, userId, disabled: disable }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            }
        );

    } catch (error: any) {
        console.error("Error in toggle-user-status:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
