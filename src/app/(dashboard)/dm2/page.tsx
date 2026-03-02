import { Scope } from '@/config/constants';
import { ScopeDashboard } from '@/components/scada/ScopeDashboard';

export default function Dm2Page() {
    return <ScopeDashboard scope={Scope.DM2} />;
}
