'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun, Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { ConnectionStatus } from '@/config/constants';
import { formatSystemTime } from '@/lib/utils';
import type { RealtimeConnectionInfo } from '@/types/scada.types';
import { formatDistanceToNow } from 'date-fns';
import { vi, enUS } from 'date-fns/locale';
import { useLanguageStore } from '@/store/useLanguageStore';
import { useTranslation } from '@/hooks/useTranslation';

interface HeaderProps {
    connection: RealtimeConnectionInfo;
}

export function Header({ connection }: HeaderProps) {
    const { theme, setTheme } = useTheme();
    const { language, setLanguage } = useLanguageStore();
    const { t } = useTranslation();
    const [systemTime, setSystemTime] = useState<string>('');
    const [mounted, setMounted] = useState(false);

    // Avoid hydration mismatch
    useEffect(() => {
        setMounted(true);
    }, []);

    // Live clock
    useEffect(() => {
        const update = () => setSystemTime(formatSystemTime(new Date()));
        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, []);

    const getConnectionIcon = () => {
        switch (connection.status) {
            case ConnectionStatus.CONNECTED:
                return <Cloud className="h-4 w-4 text-emerald-500" />;
            case ConnectionStatus.RECONNECTING:
                return <RefreshCw className="h-4 w-4 text-amber-500 animate-spin" />;
            case ConnectionStatus.DISCONNECTED:
                return <CloudOff className="h-4 w-4 text-red-500" />;
        }
    };

    const getConnectionLabel = () => {
        switch (connection.status) {
            case ConnectionStatus.CONNECTED:
                return t('header.connected' as any);
            case ConnectionStatus.RECONNECTING:
                return t('header.reconnecting' as any);
            case ConnectionStatus.DISCONNECTED:
                return t('header.disconnected' as any);
        }
    };

    return (
        <header className="sticky top-0 z-30 h-14 sm:h-16 bg-card/80 backdrop-blur-md border-b border-border flex items-center justify-between px-3 sm:px-6 lg:px-8">
            {/* Left side — spacer for mobile hamburger */}
            <div className="lg:hidden w-10" />

            {/* Center / Left — Page title area */}
            <div className="hidden lg:block">
                <h2 className="text-lg font-semibold text-foreground/90">
                    Solar SCADA Dashboard
                </h2>
            </div>

            {/* Right side — status indicators */}
            <div className="flex items-center gap-2 sm:gap-4 ml-auto">
                {/* Cloud Status */}
                <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-muted/50 border border-border text-xs sm:text-base">
                    {getConnectionIcon()}
                    <span className="hidden sm:inline text-foreground/80 font-medium">
                        {getConnectionLabel()}
                    </span>
                </div>

                {/* Last Sync Time */}
                {connection.lastSyncTime && (
                    <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-base font-medium text-foreground/80 bg-muted/50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-border">
                        <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span>
                            {t('header.lastUpdated' as any)} {' '}
                            {formatDistanceToNow(connection.lastSyncTime, { addSuffix: true, locale: language === 'vi' ? vi : enUS })}
                        </span>
                    </div>
                )}

                {/* System Time */}
                <div className="hidden sm:block text-xs sm:text-base font-mono font-medium text-foreground/80 bg-muted/50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-border">
                    {systemTime}
                </div>

                {/* Language Toggle */}
                {mounted && (
                    <button
                        onClick={() => setLanguage(language === 'vi' ? 'en' : 'vi')}
                        className="px-2 rounded-lg hover:bg-muted transition-colors border border-border text-xs sm:text-sm font-semibold h-8 sm:h-9 flex items-center justify-center min-w-[36px]"
                        aria-label="Toggle language"
                    >
                        {language.toUpperCase()}
                    </button>
                )}

                {/* Theme Toggle */}
                {mounted && (
                    <button
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        className="p-2 rounded-lg hover:bg-muted transition-colors border border-border h-8 sm:h-9 w-8 sm:w-9 flex items-center justify-center"
                        aria-label="Toggle theme"
                    >
                        {theme === 'dark' ? (
                            <Sun className="h-4 w-4 text-amber-500" />
                        ) : (
                            <Moon className="h-4 w-4 text-slate-700" />
                        )}
                    </button>
                )}
            </div>
        </header>
    );
}
