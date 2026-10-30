import { useState } from 'react';
import { Overview } from '../../../../templates/blueprints/Overview';
import { ReportsIndex } from '../../../../templates/blueprints/ReportsIndex';
import type { WidgetState } from '../../../../templates/blueprints/shared';
import { DemoShell } from '../DemoShell';
import { SAAS_NAV, useNotWired } from '../demo';
import type { PreviewChoice } from '../types';

export default function Screen(preview: PreviewChoice) {
  const [view, setView] = useState<'/' | '/reports'>('/');
  const notWired = useNotWired();
  const state = preview.state as WidgetState;
  const overview = ['all', 'numbers', 'today'].includes(preview.widget);
  const reports = ['all', 'reports'].includes(preview.widget);
  return (
    <DemoShell brand="Kassan" nav={SAAS_NAV} active={view} onNavigate={(href) => (href === '/' || href === '/reports' ? setView(href) : notWired(href))}>
      {view === '/' ? (
        <Overview
          previewState={overview ? { widget: preview.widget as 'numbers' | 'today' | 'all', state } : undefined}
          onNavigate={(href) => (href === '/reports' ? setView('/reports') : notWired(href))}
        />
      ) : (
        <ReportsIndex previewState={reports ? { widget: 'all', state } : undefined} />
      )}
    </DemoShell>
  );
}
