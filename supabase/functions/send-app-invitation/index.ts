import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://jmanwit.github.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return response({ error: "Method not allowed." }, 405);

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return response({ error: "Sign in with the administrator account first." }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const adminEmail = (Deno.env.get("SOB_ADMIN_EMAIL") || "").trim().toLowerCase();
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !adminEmail) {
    return response({ error: "Invitation service is not configured. Contact the Shack Out Back administrator." }, 503);
  }

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: userError } = await callerClient.auth.getUser(token);
  if (userError || !user?.email) return response({ error: "Your sign-in could not be verified. Please sign in again." }, 401);
  if (user.email.trim().toLowerCase() !== adminEmail) {
    return response({ error: "Only the Shack Out Back administrator can invite new app users." }, 403);
  }

  let body: { email?: unknown };
  try { body = await req.json(); } catch { return response({ error: "Request body must be JSON." }, 400); }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return response({ error: "Enter a valid email address." }, 400);
  }
  if (email === adminEmail) return response({ error: "That email is already the administrator account." }, 400);

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    redirectTo: "https://jmanwit.github.io/Inventory_Management/",
  });
  if (error) {
    const message = /already|registered|exists/i.test(error.message)
      ? "That email may already have a Shack Out Back account. If so, use the existing account and invite it to a ledger separately."
      : "Supabase could not send the invitation. Check the project's email settings and try again.";
    return response({ error: message }, 400);
  }
  return response({ ok: true, invited: email });
});
