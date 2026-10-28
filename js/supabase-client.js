import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";
if (!SUPABASE_URL.startsWith("https://") || SUPABASE_URL.includes("YOUR_PROJECT_REF") || !SUPABASE_PUBLISHABLE_KEY || SUPABASE_PUBLISHABLE_KEY.includes("YOUR_SUPABASE")) {
  throw new Error("Supabase is not configured yet. Add your project URL and publishable key in js/config.js.");
}
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
