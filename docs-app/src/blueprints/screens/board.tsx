import { Board } from '../../../../templates/blueprints/Board';
import type { WidgetState } from '../../../../templates/blueprints/shared';
import type { PreviewChoice } from '../types';

export default function Screen(p: PreviewChoice) {
  return <Board embedded previewState={{ widget: 'all', state: p.state as WidgetState }} />;
}
