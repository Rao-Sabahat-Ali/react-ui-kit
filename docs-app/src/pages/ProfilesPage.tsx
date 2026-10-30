import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { Button, Checkbox, Field, InputText, parseCssTime, type Profile } from '@sabahat/react-ui-kit';
import { profiles, type CatalogProfile } from '../registry';

interface Facts {
  radius: string;
  touch: string;
  control: string;
  motion: string;
}

const px = (value: string): string => {
  const v = value.trim();
  if (v.endsWith('rem')) return `${Math.round(parseFloat(v) * 16 * 10) / 10} px`;
  if (v.endsWith('px')) return `${parseFloat(v)} px`;
  return v;
};

/** The structure a profile sets, read from the live tokens of the sample (so it can never drift from the CSS). */
function useFacts(): [RefObject<HTMLDivElement | null>, Facts | null] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [facts, setFacts] = useState<Facts | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const css = getComputedStyle(el);
    const get = (name: string) => css.getPropertyValue(name);
    if (!get('--ui-radius').trim()) return;
    setFacts({
      radius: `${px(get('--ui-radius'))} parts, ${px(get('--ui-radius-lg'))} sheets`,
      touch: `${px(get('--ui-touch-target-min'))} minimum`,
      control: `${px(get('--ui-control-height-md'))} high`,
      motion: `${Math.round(parseCssTime(get('--ui-motion-part'), 0))} ms part, ${px(get('--ui-assemble-distance'))} travel`,
    });
  }, []);
  return [ref, facts];
}

/** One profile on its own surface, so profiles can be compared side by side (the theme is the page's). */
function ProfileSample({ p }: { p: CatalogProfile }) {
  const [ref, facts] = useFacts();
  return (
    <div ref={ref} data-ui-profile={p.name as Profile} className="docs-profile">
      <h2 className="h4 mb-1">{p.name}</h2>
      <p className="text-body-secondary mb-3">{p.description}</p>
      <dl className="docs-profile__facts">
        <div>
          <dt>Default theme</dt>
          <dd>{p.defaultTheme === 'system' ? 'follows the system' : p.defaultTheme}</dd>
        </div>
        <div>
          <dt>Density</dt>
          <dd>{p.density}</dd>
        </div>
        <div>
          <dt>Touch target</dt>
          <dd>{facts?.touch ?? '…'}</dd>
        </div>
        <div>
          <dt>Controls</dt>
          <dd>{facts?.control ?? '…'}</dd>
        </div>
        <div>
          <dt>Radius</dt>
          <dd>{facts?.radius ?? '…'}</dd>
        </div>
        <div>
          <dt>Motion</dt>
          <dd>{facts?.motion ?? '…'}</dd>
        </div>
      </dl>
      <Field label="Search" labelHidden>
        <InputText placeholder="Search…" />
      </Field>
      <div className="d-flex flex-wrap align-items-center gap-3">
        <Button>Primary</Button>
        <Button appearance="outline" variant="secondary">
          Outline
        </Button>
        <Checkbox label="Option" defaultChecked />
      </div>
    </div>
  );
}

export function ProfilesPage() {
  return (
    <>
      <header className="docs-page-header">
        <h1>App profiles</h1>
        <p className="lead text-body-secondary">
          One profile per app or surface. A profile changes structure, not the world: density, touch target, radius, motion and default theme, and for a few profiles the primary or accent hue (pos go-green,
          ecommerce orange, cms pencil red, game signal yellow). Each profile also has a default theme (game opens on the night sheet): switch the profile in the top bar and the whole docs app adopts it, unless you have picked a theme yourself.
        </p>
      </header>
      <div className="row g-4">
        {profiles.map((p) => (
          <div className="col-lg-6" key={p.name}>
            <ProfileSample p={p} />
          </div>
        ))}
      </div>
    </>
  );
}
