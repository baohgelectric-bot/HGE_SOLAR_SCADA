'use client';

import { useEffect, useState, useRef } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Hook to track the number of users currently online using Supabase Realtime Presence.
 * Each browser tab counts as one presence.
 */
export function useOnlineUsers() {
    const [onlineCount, setOnlineCount] = useState(0);
    const channelRef = useRef<RealtimeChannel | null>(null);

    useEffect(() => {
        const supabase = getSupabaseBrowserClient();
        const userId = crypto.randomUUID();

        const channel = supabase.channel('online-users', {
            config: {
                presence: {
                    key: userId,
                },
            },
        });

        channelRef.current = channel;

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                const count = Object.keys(state).length;
                setOnlineCount(count);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({
                        user_id: userId,
                        online_at: new Date().toISOString(),
                    });
                }
            });

        return () => {
            channel.untrack();
            supabase.removeChannel(channel);
        };
    }, []);

    return onlineCount;
}
