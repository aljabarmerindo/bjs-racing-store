// File: /src/lib/supabaseServer.ts (NAMA BARU)
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { APIContext } from "astro";

// 1. Klien untuk SISI SERVER (Middleware, dll.)
export function supabaseServerClient(context: APIContext) {
  return createServerClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get: (key: string) => context.cookies.get(key)?.value,
        set: (key: string, value: string, options: Record<string, unknown>) =>
          context.cookies.set(key, value, options),
        remove: (key: string, options: Record<string, unknown>) =>
          context.cookies.delete(key, options),
      },
    },
  );
}

// 2. Klien ADMIN untuk SISI SERVER (API Routes)
export const supabaseAdmin = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);
