// File: /src/lib/supabaseBrowserClient.ts
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) return client;
  client = createBrowserClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
  );
  return client;
}

// Backward-compatible export (lazy getter via Proxy)
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    const client = getSupabase();
    // @ts-expect-error — dynamic property access on SupabaseClient
    const value = client[prop];
    // Bind methods to client instance to preserve `this` context
    return typeof value === "function" ? value.bind(client) : value;
  },
});
