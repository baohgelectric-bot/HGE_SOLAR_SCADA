import {
    LayoutDashboard,
    Layers,
    Building2,
    Cpu,
    Download,
    Monitor,
    type LucideIcon,
} from 'lucide-react';
import { Scope, SCOPE_LABELS } from './constants';

export const siteConfig = {
    name: 'Solar SCADA Dashboard',
    description: 'Enterprise Solar SCADA Monitoring System',
    timezone: 'Asia/Ho_Chi_Minh',
} as const;

export interface NavItem {
    title: string;
    href: string;
    icon: LucideIcon;
    scope?: Scope;
}

export const navItems: NavItem[] = [
    {
        title: 'Plant Overview',
        href: '/',
        icon: LayoutDashboard,
    },
    {
        title: SCOPE_LABELS[Scope.TOTAL],
        href: '/total',
        icon: Layers,
        scope: Scope.TOTAL,
    },
    {
        title: SCOPE_LABELS[Scope.TOTAL_A],
        href: '/umc4a',
        icon: Building2,
        scope: Scope.TOTAL_A,
    },
    {
        title: SCOPE_LABELS[Scope.TOTAL_B],
        href: '/umc4b',
        icon: Building2,
        scope: Scope.TOTAL_B,
    },
    {
        title: SCOPE_LABELS[Scope.DM1],
        href: '/dm1',
        icon: Cpu,
        scope: Scope.DM1,
    },
    {
        title: SCOPE_LABELS[Scope.DM2],
        href: '/dm2',
        icon: Cpu,
        scope: Scope.DM2,
    },
    {
        title: SCOPE_LABELS[Scope.DM3],
        href: '/dm3',
        icon: Cpu,
        scope: Scope.DM3,
    },
    {
        title: 'So sánh',
        href: '/compare',
        icon: Layers,
    },
    {
        title: 'Xuất dữ liệu',
        href: '/export',
        icon: Download,
    },
    {
        title: 'Monitor Backend',
        href: '/monitor',
        icon: Monitor,
    },
];
