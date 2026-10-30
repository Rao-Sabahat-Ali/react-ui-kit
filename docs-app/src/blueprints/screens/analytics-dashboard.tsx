import { AnalyticsDashboard } from '../../../../templates/blueprints/AnalyticsDashboard';
import type { WidgetState } from '../../../../templates/blueprints/shared';
import type { PreviewChoice } from '../types';

export default function Screen(p: PreviewChoice) {
  return <AnalyticsDashboard embedded previewState={{ widget: p.widget as 'all', state: p.state as WidgetState }} />;
}
