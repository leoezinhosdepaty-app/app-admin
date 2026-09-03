import { createClient } from "@supabase/supabase-js";

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  throw new Error("SUPABASE_URL / SUPABASE_SERVICE_KEY não configurados no .env");
}

export const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
