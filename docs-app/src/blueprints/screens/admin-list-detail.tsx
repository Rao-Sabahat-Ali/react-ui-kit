import { AdminListDetail } from '../../../../templates/blueprints/AdminListDetail';
import type { WidgetState } from '../../../../templates/blueprints/shared';
import type { PreviewChoice } from '../types';

export default function Screen(p: PreviewChoice) {
  return <AdminListDetail embedded previewState={{ widget: 'all', state: p.state as WidgetState }} />;
}
