'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { ConnectionStatus } from '@/config/constants';
import { isStale } from '@/lib/utils';
import type { RealtimeState } from '@/types/database.types';
import type { RealtimeConnectionInfo } from '@/types/scada.types';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeDataOptions {
    varNames: string[];
    enabled?: boolean;
}

interface UseRealtimeDataReturn {
    data: Map<string, RealtimeState & { isStaleComputed: boolean }>;
    connection: RealtimeConnectionInfo;
    refetch: () => Promise<void>;
}

export function useRealtimeData({
    varNames,
    enabled = true,
}: UseRealtimeDataOptions): UseRealtimeDataReturn {
    const [data, setData] = useState<
        Map<string, RealtimeState & { isStaleComputed: boolean }>
    >(new Map());
    const [connection, setConnection] = useState<RealtimeConnectionInfo>({
        status: ConnectionStatus.DISCONNECTED,
        lastSyncTime: null,
    });
    const channelRef = useRef<RealtimeChannel | null>(null);

    // Fetch initial data
    const fetchInitial = useCallback(async () => {
        if (varNames.length === 0) return;
        try {
            const supabase = getSupabaseBrowserClient();
            const { data: rows, error } = await supabase
                .from('realtime_states')
                .select('*')
                .in('var_name', varNames);

            if (error) throw error;

            const newMap = new Map<string, RealtimeState & { isStaleComputed: boolean }>();
            (rows as RealtimeState[])?.forEach((row) => {
                newMap.set(row.var_name, {
                    ...row,
                    isStaleComputed: isStale(row.source_ts, row.updated_at),
                });
            });
            setData(newMap);
            setConnection((prev) => ({ ...prev, lastSyncTime: new Date() }));
        } catch (err) {
            console.error('Failed to fetch initial realtime data:', err);
        }
    }, [varNames]);

    // Subscribe to realtime changes
    useEffect(() => {
        if (!enabled || varNames.length === 0) return;

        const supabase = getSupabaseBrowserClient();

        // Initial fetch
        fetchInitial();

        // Create subscription channel
        const channel = supabase
            .channel(`realtime-states-${varNames.join('-')}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'realtime_states',
                    filter: `var_name=in.(${varNames.join(',')})`,
                },
                (payload) => {
                    const newRow = payload.new as RealtimeState;
                    if (newRow && newRow.var_name) {
                        setData((prev) => {
                            const updated = new Map(prev);
                            updated.set(newRow.var_name, {
                                ...newRow,
                                isStaleComputed: isStale(newRow.source_ts, newRow.updated_at),
                            });
                            return updated;
                        });
                        setConnection((prev) => ({
                            ...prev,
                            lastSyncTime: new Date(),
                        }));
                    }
                },
            )
            .subscribe((status) => {
                switch (status) {
                    case 'SUBSCRIBED':
                        setConnection((prev) => ({
                            ...prev,
                            status: ConnectionStatus.CONNECTED,
                        }));
                        break;
                    case 'CHANNEL_ERROR':
                        setConnection((prev) => ({
                            ...prev,
                            status: ConnectionStatus.RECONNECTING,
                        }));
                        break;
                    case 'CLOSED':
                        setConnection((prev) => ({
                            ...prev,
                            status: ConnectionStatus.DISCONNECTED,
                        }));
                        break;
                    case 'TIMED_OUT':
                        setConnection((prev) => ({
                            ...prev,
                            status: ConnectionStatus.RECONNECTING,
                        }));
                        break;
                }
            });

        channelRef.current = channel;

        // Cleanup on unmount
        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [enabled, varNames, fetchInitial]);

    // Periodic stale recomputation (every 10s)
    useEffect(() => {
        const interval = setInterval(() => {
            setData((prev) => {
                const updated = new Map(prev);
                let changed = false;
                updated.forEach((val, key) => {
                    const newStale = isStale(val.source_ts, val.updated_at);
                    if (newStale !== val.isStaleComputed) {
                        updated.set(key, { ...val, isStaleComputed: newStale });
                        changed = true;
                    }
                });
                return changed ? updated : prev;
            });
        }, 10_000);

        return () => clearInterval(interval);
    }, []);

    return {
        data,
        connection,
        refetch: fetchInitial,
    };
}
