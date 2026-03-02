import { Scope } from '@/config/constants';
import { ScopeDashboard } from '@/components/scada/ScopeDashboard';

export default function Umc4aPage() {
    return <ScopeDashboard scope={Scope.TOTAL_A} />;
}
