import { Scope } from '@/config/constants';
import { ScopeDashboard } from '@/components/scada/ScopeDashboard';

export default function TotalPage() {
    return <ScopeDashboard scope={Scope.TOTAL} />;
}
