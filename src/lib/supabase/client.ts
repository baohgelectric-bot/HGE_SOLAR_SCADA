import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let client: ReturnType<typeof createClient> | null = null;

export function getSupabaseBrowserClient() {
    if (client) return client;
    client = createClient(supabaseUrl, supabaseAnonKey, {
        realtime: {
            params: {
                eventsPerSecond: 10,
            },
        },
    });
    return client;
}
