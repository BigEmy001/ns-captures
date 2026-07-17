import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const ERR_MSG = "Supabase not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment, then restart the dev server and redeploy on Vercel.";

const realClient = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

function createProxy(): SupabaseClient {
  return new Proxy({} as SupabaseClient, {
    get(_, prop) {
      if (!realClient) {
        if (prop === "then") return undefined;
        throw new Error(ERR_MSG);
      }
      return (realClient as any)[prop];
    },
  });
}

export const supabase = createProxy();

export function isSupabaseReady() {
  return !!realClient;
}
