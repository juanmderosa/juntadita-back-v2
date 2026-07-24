import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "./config.js";
import { HttpError } from "../types/httpError.js";

let supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin() {
  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
    throw new HttpError("Supabase server configuration is missing", 500, [
      { field: "SUPABASE_URL", message: "Required for backend auth" },
      { field: "SUPABASE_SECRET_KEY", message: "Required for backend auth" },
    ]);
  }

  supabaseAdmin ??= createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseAdmin;
}
