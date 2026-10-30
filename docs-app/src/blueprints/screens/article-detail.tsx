import { OrderDetail, type OrderDetailState } from '../../../../templates/blueprints/OrderDetail';
import { DemoShell } from '../DemoShell';
import { useNotWired } from '../demo';
import type { PreviewChoice } from '../types';

export default function Screen({ state }: PreviewChoice) {
  const notWired = useNotWired();
  return (
    <DemoShell
      brand="Nordic Tools"
      nav={[
        { label: 'Overview', href: '/', icon: 'home', section: 'Sales' },
        { label: 'Orders', href: '/orders', icon: 'filter', section: 'Sales' },
        { label: 'Customers', href: '/customers', icon: 'user', section: 'Sales' },
      ]}
      active="/orders"
      onNavigate={notWired}
    >
      <OrderDetail state={state as OrderDetailState} onNavigate={notWired} />
    </DemoShell>
  );
}
