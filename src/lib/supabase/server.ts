import { createClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase client for SSR data fetching.
 * Creates a new client per request (no singleton needed server-side).
 */
export function getSupabaseServerClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    return createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: false,
        },
    });
}
