import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const realClient = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

const noopResult = { data: null, error: new Error("Supabase not configured"), count: null, status: 0, statusText: "" };

function noopQuery(): any {
  return new Proxy(noopResult, {
    get(t, p) {
      if (p === "then") return undefined;
      if (p === "catch") return (fn: any) => { fn(noopResult.error); return Promise.resolve(noopResult); };
      if (p === "finally") return (fn: any) => { fn(); return Promise.resolve(noopResult); };
      if (typeof p === "string" && ["select", "insert", "update", "upsert", "delete", "eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike", "is", "in", "contains", "containedBy", "rangeLt", "rangeGt", "rangeGte", "rangeLte", "order", "limit", "range", "single", "maybeSingle", "textSearch", "not", "or", "filter", "match", "csv", "url", "headers", "abortSignal"].includes(p)) {
        return () => noopQuery();
      }
      return (t as any)[p];
    },
  });
}

function createProxy(): SupabaseClient {
  if (realClient) return realClient;

  const authShim = {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    setSession: () => Promise.resolve({ data: { session: null }, error: null }),
    signUp: () => Promise.resolve({ data: { user: null, session: null }, error: new Error("Supabase not configured") }),
    signInWithPassword: () => Promise.resolve({ data: { user: null, session: null }, error: new Error("Supabase not configured") }),
    signOut: () => Promise.resolve({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    updateUser: () => Promise.resolve({ data: { user: null }, error: new Error("Supabase not configured") }),
    resetPasswordForEmail: () => Promise.resolve({ data: {}, error: new Error("Supabase not configured") }),
    signInWithOAuth: () => Promise.resolve({ data: { provider: null, url: null }, error: new Error("Supabase not configured") }),
  };

  const storageShim = {
    from: () => ({
      upload: () => Promise.resolve({ data: null, error: new Error("Supabase not configured") }),
      getPublicUrl: () => ({ data: { publicUrl: "" } }),
      list: () => Promise.resolve({ data: null, error: new Error("Supabase not configured") }),
      remove: () => Promise.resolve({ data: null, error: new Error("Supabase not configured") }),
    }),
  };

  return new Proxy({} as SupabaseClient, {
    get(_, prop) {
      if (prop === "auth") return authShim;
      if (prop === "storage") return storageShim;
      if (prop === "from") return () => noopQuery();
      if (prop === "rpc") return () => Promise.resolve({ data: null, error: new Error("Supabase not configured") });
      if (prop === "channel") return () => ({ send: () => {}, unsubscribe: () => {}, subscribe: () => {} } as any);
      if (prop === "realtime") return { send: () => {} };
      if (prop === "then") return undefined;
      return undefined;
    },
  });
}

export const supabase = createProxy();

export function isSupabaseReady() {
  return !!realClient;
}
