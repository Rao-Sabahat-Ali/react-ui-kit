import { useEffect, useState } from 'react';
import { Select, SelectButton, ToastProvider, type Profile } from '@sabahat/react-ui-kit';
import { CodeBlock } from '../components/CodeBlock';
import { findBlueprint, sourceOf, type Blueprint } from '../blueprints/registry';
import { href } from '../router';

/**
 * One blueprint: a live screen in a frame (it brings its own `main` landmark and the single h1), followed by the
 * pattern note and the source to copy. The docs profile follows the blueprint's profile when the page opens.
 */
export function BlueprintPage({ slug, onProfileChange }: { slug: string; onProfileChange: (profile: Profile) => void }) {
  const blueprint = findBlueprint(slug);
  useEffect(() => {
    if (blueprint) onProfileChange(blueprint.profile);
  }, [blueprint, onProfileChange]);
  if (!blueprint) return null;
  return (
    <ToastProvider>
      <BlueprintView key={blueprint.slug} blueprint={blueprint} />
    </ToastProvider>
  );
}

function BlueprintView({ blueprint }: { blueprint: Blueprint }) {
  const [widget, setWidget] = useState('all');
  const [state, setState] = useState('ready');
  const { preview } = blueprint;
  return (
    <div className="docs-blueprint">
      <p className="docs-blueprint__lead">
        <a href={href('blueprints')}>Blueprints</a>
        <span aria-hidden="true"> / </span>
        <strong>{blueprint.title}</strong>
      </p>
      <p className="text-body-secondary docs-blueprint__try">
        Profile {blueprint.profile}. {blueprint.tryIt}
      </p>

      {preview && (
        <div className="docs-blueprint__controls" role="group" aria-label="Preview controls">
          <span className="small text-body-secondary">Preview state</span>
          <SelectButton<string> aria-label="State" size="sm" variant="secondary" value={state} onChange={(v) => v && setState(v)} options={preview.states} />
          {preview.widgets && (
            <div className="docs-blueprint__widget">
              <Select<string> aria-label="Applies to" size="sm" options={preview.widgets} value={widget} onChange={(v) => setWidget(v ?? 'all')} />
            </div>
          )}
        </div>
      )}

      <div className="docs-blueprint__frame">{blueprint.render({ widget, state })}</div>

      <section className="docs-blueprint__notes" aria-labelledby="bp-pattern">
        <h2 id="bp-pattern" className="h4">
          Pattern
        </h2>
        <p>
          Follows{' '}
          {blueprint.patterns.map((p, i) => (
            <span key={p}>
              {i > 0 && (i === blueprint.patterns.length - 1 ? ' and ' : ', ')}
              <code>{p}</code>
            </span>
          ))}{' '}
          from design-system-mcp. Read {blueprint.patterns.length > 1 ? 'them' : 'it'} with{' '}
          {blueprint.patterns.map((p, i) => (
            <span key={p}>
              {i > 0 && ' or '}
              <code>get_pattern(&quot;{p}&quot;)</code>
            </span>
          ))}
          .
        </p>
        <ul className="docs-list">
          {blueprint.highlights.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="bp-source">
        <h2 id="bp-source" className="h4">
          Copy source
        </h2>
        <p className="text-body-secondary">
          Copy these files into <code>src/</code> of an app built on the kit. They import only from <code>@sabahat/react-ui-kit</code>.{' '}
          {blueprint.profile === 'dashboard' || blueprint.profile === 'admin' ? (
            <>
              <code>npm run create-app -- my-app --profile {blueprint.profile}</code> scaffolds this screen as the home page.
            </>
          ) : null}
        </p>
        {blueprint.files.map((file) => (
          <div key={file} className="mb-4">
            <h3 className="h6 font-monospace">{file}</h3>
            <CodeBlock tall label={file} code={sourceOf(file)} />
          </div>
        ))}
      </section>
    </div>
  );
}
