import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {

        // 0. Verify the caller is authenticated
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Missing Authorization Header' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Create a Supabase client with the Auth Header to verify the user
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        );

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

        if (userError || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized: Invalid Token' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Check if the user is a superadmin (optional, but good for security)
        // For now we just check if they are authenticated as the plan required "verify caller is authenticated".
        console.log(`Caller verified: ${user.id} (${user.email})`);

        // 1. Create Supabase Client with Service Role Key for Admin operations
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

        // 2. Parse Request Body
        const { username, password, name } = await req.json();

        if (!username || !password || !name) {
            throw new Error("Missing required fields: username, password, name");
        }

        const email = `${username.toLowerCase().replace(/[^a-z0-9]/g, '')}@graft.local`;
        console.log(`Creating tenant: ${username} -> ${email} (${name})`);

        // 3. Create Auth User
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: name, username },
        });

        if (authError) {
            console.error("Auth creation failed:", authError);
            throw authError;
        }

        if (!authData.user) {
            throw new Error("User creation failed (no data returned)");
        }

        const userId = authData.user.id;
        const accountId = `account_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        console.log(`User created: ${userId}. Creating profile...`);

        // 4. Create Profile (Tenant)
        // We use the admin client to bypass the "Users can update own profile" RLS if necessary,
        // though usually inserting another user's profile definitely needs admin/service_role.
        const { error: profileError } = await supabaseAdmin
            .from("profiles")
            .insert({
                id: userId,
                username: username,
                full_name: name,
                role: "clinic_admin",
                account_id: accountId,
                profile_image: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
                is_disabled: false,
            });

        if (profileError) {
            console.error("Profile creation failed:", profileError);
            // Cleanup: delete the user if profile creation failed to avoid orphans
            await supabaseAdmin.auth.admin.deleteUser(userId);
            throw profileError;
        }

        return new Response(
            JSON.stringify({ user: authData.user, accountId }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            }
        );
    } catch (error: any) {
        console.error("Error in create-tenant:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
