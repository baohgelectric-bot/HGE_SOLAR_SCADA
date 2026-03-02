'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Sun, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { navItems } from '@/config/site';
import { siteConfig } from '@/config/site';

export function Sidebar() {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <>
            {/* Mobile hamburger */}
            <button
                onClick={() => setMobileOpen(true)}
                className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-card border border-border shadow-lg"
            >
                <Menu className="h-5 w-5" />
            </button>

            {/* Overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    'fixed top-0 left-0 z-50 h-screen w-64 bg-card border-r border-border',
                    'flex flex-col transition-transform duration-300',
                    'lg:translate-x-0 lg:static lg:z-auto',
                    mobileOpen ? 'translate-x-0' : '-translate-x-full',
                )}
            >
                {/* Logo */}
                <div className="flex items-center justify-between h-16 px-6 border-b border-border">
                    <div className="flex items-center gap-2">
                        <Sun className="h-6 w-6 text-amber-500" />
                        <span className="font-bold text-lg tracking-tight">
                            {siteConfig.name}
                        </span>
                    </div>
                    <button
                        onClick={() => setMobileOpen(false)}
                        className="lg:hidden p-1 rounded hover:bg-muted"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive =
                            pathname === item.href ||
                            (item.href !== '/' && pathname.startsWith(item.href));
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setMobileOpen(false)}
                                className={cn(
                                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-lg font-medium transition-all',
                                    isActive
                                        ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm'
                                        : 'text-foreground/80 hover:text-foreground hover:bg-muted',
                                )}
                            >
                                <Icon className="h-4 w-4 flex-shrink-0" />
                                <span>{item.title}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-border">
                    <p className="text-xs text-muted-foreground text-center">
                        HGESolarSCADA v1.0
                    </p>
                </div>
            </aside>
        </>
    );
}
