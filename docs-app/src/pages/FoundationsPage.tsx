import { useEffect, useRef, useState } from 'react';
import { Button, Card, MOTION, useAssemble, useTheme } from '@sabahat/react-ui-kit';

const INTENTS = ['primary', 'secondary', 'success', 'danger', 'warning', 'info'];
const SURFACES = ['bg', 'bg-subtle', 'surface', 'surface-raised', 'surface-sunken', 'border', 'border-strong'];
const TEXT = ['text', 'text-muted', 'text-subtle', 'link'];
const SHELL = ['shell', 'shell-hover', 'line', 'line-muted'];
const SPACE = ['1', '2', '3', '4', '5', '6', '8', '10', '12', '16'];

/** Read resolved token values from the live document so swatches reflect theme + profile. */
function useTokenValues(names: string[], deps: unknown[]) {
  const [values, setValues] = useState<Record<string, string>>({});
  useEffect(() => {
    const style = getComputedStyle(document.documentElement);
    setValues(Object.fromEntries(names.map((n) => [n, style.getPropertyValue(`--ui-${n}`).trim()])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return values;
}

function Swatch({ token, value, fg }: { token: string; value: string | undefined; fg?: string }) {
  return (
    <div className="docs-swatch">
      <div className="docs-swatch__chip" style={{ background: `var(--ui-${token})`, color: fg ? `var(--ui-${fg})` : undefined }}>
        {fg ? 'Aa' : ''}
      </div>
      <code className="small">--ui-{token}</code>
      <span className="small text-body-secondary">{value}</span>
    </div>
  );
}

function AssembleDemo() {
  const ref = useRef<HTMLUListElement>(null);
  const { replay } = useAssemble(ref, { parts: 'li' });
  return (
    <>
      <ul ref={ref} className="docs-motion-demo">
        {['Frame', 'Panel', 'Hinge', 'Screws'].map((part) => (
          <li key={part}>{part}</li>
        ))}
      </ul>
      <Button variant="secondary" appearance="outline" size="sm" icon="refresh" onClick={replay}>
        Replay
      </Button>
    </>
  );
}

export function FoundationsPage() {
  const { resolvedTheme, profile } = useTheme();
  const all = [
    ...INTENTS.flatMap((i) => [`color-${i}`, `color-${i}-subtle`]),
    ...SURFACES.map((s) => `color-${s}`),
    ...TEXT.map((t) => `color-${t}`),
    ...SHELL.map((t) => `color-${t}`),
    ...Array.from({ length: 8 }, (_, i) => `color-chart-${i + 1}`),
    'radius', 'radius-lg', 'control-height-md', 'font-size-base',
  ];
  const values = useTokenValues(all, [resolvedTheme, profile]);

  return (
    <>
      <header className="docs-page-header">
        <h1>Foundations</h1>
        <p className="lead text-body-secondary">
          Live token values for theme <strong>{resolvedTheme}</strong> and profile <strong>{profile}</strong>. Source of truth: <code>specs/tokens/tokens.json</code>.
        </p>
      </header>
      <h2 className="h4">Intents</h2>
      <div className="docs-swatches mb-4">
        {INTENTS.map((i) => (
          <Swatch key={i} token={`color-${i}`} value={values[`color-${i}`]} fg={`color-${i}-contrast`} />
        ))}
        {INTENTS.map((i) => (
          <Swatch key={`${i}-s`} token={`color-${i}-subtle`} value={values[`color-${i}-subtle`]} fg={`color-${i}-emphasis`} />
        ))}
      </div>
      <h2 className="h4">Surfaces and text</h2>
      <div className="docs-swatches mb-4">
        {SURFACES.map((s) => <Swatch key={s} token={`color-${s}`} value={values[`color-${s}`]} fg="color-text" />)}
        {TEXT.map((t) => <Swatch key={t} token={`color-${t}`} value={values[`color-${t}`]} />)}
      </div>
      <h2 className="h4">Shell and lines</h2>
      <p className="text-body-secondary">Kraft cardboard for the rail and top bars, 2px ink lines for structure, hairlines only inside dense data.</p>
      <div className="docs-swatches mb-4">
        <Swatch token="color-shell" value={values['color-shell']} fg="color-shell-contrast" />
        <Swatch token="color-shell-hover" value={values['color-shell-hover']} fg="color-shell-contrast" />
        <Swatch token="color-line" value={values['color-line']} />
        <Swatch token="color-line-muted" value={values['color-line-muted']} />
      </div>
      <h2 className="h4">Data visualisation</h2>
      <div className="docs-swatches mb-4">
        {Array.from({ length: 8 }, (_, i) => <Swatch key={i} token={`color-chart-${i + 1}`} value={values[`color-chart-${i + 1}`]} />)}
      </div>
      <h2 className="h4">Motion: assemble</h2>
      <p className="text-body-secondary">
        Parts slide {MOTION.assembleDistance}px along the guide line, {MOTION.stagger} ms apart, and the last one clicks into place. Reduced motion turns this into a short fade.
      </p>
      <AssembleDemo />
      <h2 className="h4">Shape, density and spacing</h2>
      <div className="row g-3 mb-4">
        <div className="col-md-4"><Card title="Radius" subtitle={`${values.radius} / lg ${values['radius-lg']}`} /></div>
        <div className="col-md-4"><Card title="Control height" subtitle={values['control-height-md']} /></div>
        <div className="col-md-4"><Card title="Base font size" subtitle={values['font-size-base']} /></div>
      </div>
      <div className="d-flex flex-column gap-2">
        {SPACE.map((s) => (
          <div key={s} className="d-flex align-items-center gap-3">
            <code className="small" style={{ width: '7rem' }}>--ui-space-{s}</code>
            <span className="docs-space-bar" style={{ width: `var(--ui-space-${s})` }} />
          </div>
        ))}
      </div>
    </>
  );
}
