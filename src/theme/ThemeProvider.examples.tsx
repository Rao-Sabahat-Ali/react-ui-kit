import { useState } from 'react';
import { Button } from '../components/Button/Button';
import { Field } from '../components/Field/Field';
import { InputText } from '../components/InputText/InputText';
import { Message } from '../components/Message/Message';
import { Select } from '../components/Select/Select';
import { SelectButton } from '../components/SelectButton/SelectButton';
import { Tag } from '../components/Tag/Tag';
import { PROFILES, type Density, type Profile, type ThemeSetting } from './profiles.generated';
import { ThemeProvider, useTheme } from './ThemeProvider';

const PROFILE_OPTIONS = (Object.keys(PROFILES) as Profile[]).map((p) => ({ label: p, value: p }));

function Readout() {
  const { profile, theme, resolvedTheme, density } = useTheme();
  return (
    <p className="mb-3 text-body-secondary small">
      <code>useTheme()</code>: profile <strong>{profile}</strong>, theme <strong>{theme}</strong> (resolved <strong>{resolvedTheme}</strong>), density <strong>{density}</strong>
    </p>
  );
}

/** Sub-surface demo: a nested provider writes its attributes to the preview element only, never to <html>. */
function Playground() {
  const [profile, setProfile] = useState<Profile>('saas');
  const [theme, setTheme] = useState<ThemeSetting>('light');
  const [density, setDensity] = useState<Density | 'default'>('default');
  const [contrast, setContrast] = useState<'standard' | 'more'>('standard');
  const [target, setTarget] = useState<HTMLElement | null>(null);

  return (
    <div className="d-flex flex-column gap-3">
      <div className="d-flex flex-wrap gap-3 align-items-end">
        <Field label="Profile" className="mb-0">
          <Select options={PROFILE_OPTIONS} value={profile} onChange={(v) => v && setProfile(v)} />
        </Field>
        <SelectButton<ThemeSetting>
          aria-label="Theme"
          variant="secondary"
          value={theme}
          onChange={(v) => v && setTheme(v)}
          options={[{ label: 'Light', value: 'light' }, { label: 'Dark', value: 'dark' }, { label: 'System', value: 'system' }]}
        />
        <SelectButton<Density | 'default'>
          aria-label="Density"
          variant="secondary"
          value={density}
          onChange={(v) => v && setDensity(v)}
          options={[{ label: 'Profile default', value: 'default' }, { label: 'Compact', value: 'compact' }, { label: 'Comfortable', value: 'comfortable' }, { label: 'Spacious', value: 'spacious' }]}
        />
        <SelectButton<'standard' | 'more'>
          aria-label="Contrast"
          variant="secondary"
          value={contrast}
          onChange={(v) => v && setContrast(v)}
          options={[{ label: 'Standard contrast', value: 'standard' }, { label: 'More contrast', value: 'more' }]}
        />
      </div>
      <div
        ref={setTarget}
        data-ui-contrast={contrast === 'more' ? 'more' : undefined}
        className="p-4 rounded border"
        style={{ background: 'var(--ui-color-bg)', color: 'var(--ui-color-text)' }}
      >
        {/* Render the provider only once the element exists; without a target it would write to <html>. */}
        {target && (
          <ThemeProvider target={target} storageKey={null} profile={profile} theme={theme} onThemeChange={setTheme} density={density === 'default' ? undefined : density}>
            <Readout />
            <div className="d-flex flex-column gap-3" style={{ maxWidth: 420 }}>
              <Field label="Project name" help="Tokens switch with the attributes on this surface.">
                <InputText defaultValue="Nordic notes" />
              </Field>
              <Message severity="info" title="Heads up">Accent, borders and surfaces follow the profile and theme.</Message>
              <div className="d-flex flex-wrap gap-2 align-items-center">
                <Button>Save</Button>
                <Button appearance="outline">Cancel</Button>
                <Tag value="Draft" severity="warning" />
              </div>
            </div>
          </ThemeProvider>
        )}
      </div>
    </div>
  );
}

function Setter() {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  return (
    <div className="d-flex flex-wrap gap-2 align-items-center">
      <Button appearance="outline" onClick={toggleTheme}>Switch to {resolvedTheme === 'dark' ? 'light' : 'dark'}</Button>
      <Button appearance="outline" onClick={() => setTheme('system')} disabled={theme === 'system'}>Follow system</Button>
      <span className="text-body-secondary small">Current setting: {theme}</span>
    </div>
  );
}

export const examples = [
  {
    title: 'Profile, theme, density and contrast',
    description: 'A nested provider with `target` scopes the attributes to one surface. Use exactly one provider at the app root; this one only demonstrates what the props do.',
    code: `<ThemeProvider profile="admin" theme="dark" density="compact" storageKey={null} target={surfaceElement}>\n  <App />\n</ThemeProvider>\n\n// High contrast is a data attribute on the surface (or prefers-contrast: more):\n<div data-ui-contrast="more">…</div>`,
    render: () => <Playground />,
  },
  {
    title: 'useTheme in the app',
    description: 'Bound to the ThemeProvider at the docs root: setTheme persists to localStorage and applies to the whole page.',
    code: `const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();\n<Button onClick={toggleTheme}>Switch to {resolvedTheme === 'dark' ? 'light' : 'dark'}</Button>\n<Button onClick={() => setTheme('system')}>Follow system</Button>`,
    render: () => <Setter />,
  },
];
