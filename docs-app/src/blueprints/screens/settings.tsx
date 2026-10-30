import { Settings } from '../../../../templates/blueprints/Settings';
import { DemoShell } from '../DemoShell';
import { SAAS_NAV, useNotWired } from '../demo';

export default function Screen() {
  const notWired = useNotWired();
  return (
    <DemoShell brand="Kassan" nav={SAAS_NAV} active="/settings" onNavigate={notWired}>
      <Settings />
    </DemoShell>
  );
}
