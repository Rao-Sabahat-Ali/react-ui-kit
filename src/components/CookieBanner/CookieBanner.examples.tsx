import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '../Button/Button';
import { ConsentGate } from './ConsentGate';
import { ConsentProvider, useConsent } from './ConsentProvider';
import { CookieBanner } from './CookieBanner';
import type { ConsentCategory, ConsentStorage } from './types';

const CATEGORIES: ConsentCategory[] = [
  { id: 'necessary', label: 'Necessary', description: 'Sign-in and your settings.', required: true },
  { id: 'analytics', label: 'Analytics', description: 'Anonymous page counts, to see which pages are read.' },
  { id: 'marketing', label: 'Marketing', description: 'Measures whether a campaign reached you.' },
];

/** One line that shows what the example stored, and the footer-style link that reopens the choice. */
function Status() {
  const consent = useConsent();
  const granted = CATEGORIES.filter((c) => !c.required && consent.has(c.id)).map((c) => c.label);
  return (
    <div className="d-flex flex-wrap align-items-center gap-3 small">
      <output>
        {consent.record
          ? `Stored (${consent.record.mode}): ${consent.record.mode === 'notice' ? 'acknowledged' : granted.length ? `${granted.join(' and ')} on` : 'optional categories off'}.`
          : 'No decision stored yet.'}
      </output>
      <Button variant="secondary" appearance="text" size="sm" onClick={consent.openSettings}>
        Cookies and storage
      </Button>
    </div>
  );
}

/** Starts an example that is about reopening with a decision already made. */
function Seed() {
  const consent = useConsent();
  useEffect(() => {
    if (!consent.decided) consent.rejectAll();
    // Once, when the example starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

/**
 * Each example has its own storage key (never the docs site's own record) and a "Reset example" action.
 * The banner is fixed to the bottom of the window, so it only appears once you ask for it.
 */
function Stage({ id, storage = 'localStorage', categories, notice, seed, children }: { id: string; storage?: ConsentStorage; categories?: ConsentCategory[]; notice?: boolean; seed?: boolean; children?: ReactNode }) {
  const storageKey = `docs:example:cookie-banner:${id}`;
  const [run, setRun] = useState(0);
  const [shown, setShown] = useState(false);
  const reset = () => {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // nothing to clear
    }
    if (storage === 'cookie') document.cookie = 'ui_consent=; Path=/; Max-Age=0';
    setRun((n) => n + 1);
  };
  return (
    <div className="d-flex flex-column gap-3">
      <div className="d-flex flex-wrap gap-2">
        <Button variant="secondary" appearance="outline" onClick={() => setShown(true)} disabled={shown}>
          Show banner
        </Button>
        <Button variant="secondary" appearance="text" onClick={reset} disabled={!shown}>
          Reset example
        </Button>
      </div>
      {shown ? (
        <ConsentProvider key={run} policyVersion="1" storage={storage} storageKey={storageKey} categories={notice ? undefined : (categories ?? CATEGORIES)}>
          {seed && <Seed />}
          <CookieBanner policyHref="#/privacy" placement="bottom-start" />
          <Status />
          {children}
        </ConsentProvider>
      ) : (
        <p className="small text-body-secondary mb-0">The banner is fixed to the bottom of the window. Show it, decide, and reset to start again.</p>
      )}
    </div>
  );
}

const CATEGORIES_CODE = `const categories = [
  { id: 'necessary', label: 'Necessary', description: 'Sign-in and your settings.', required: true },
  { id: 'analytics', label: 'Analytics', description: 'Anonymous page counts.' },
  { id: 'marketing', label: 'Marketing', description: 'Measures whether a campaign reached you.' },
];`;

export const examples = [
  {
    title: 'Consent mode',
    description: 'Reject all and Accept all are the same button; Choose opens one switch per category (optional ones start off). Escape closes the preferences without storing anything. This example keeps its own record under its own key.',
    code: `${CATEGORIES_CODE}\n\n<ConsentProvider policyVersion="3" categories={categories}>\n  <CookieBanner policyHref="/privacy" />\n  <App />\n</ConsentProvider>`,
    render: () => <Stage id="consent" />,
  },
  {
    title: 'Notice mode',
    description: 'When everything stored is strictly necessary there is nothing to choose: one acknowledge button and the policy link. mode="auto" picks this when every category is required.',
    code: `<ConsentProvider policyVersion="2026-10">\n  <CookieBanner policyHref="/about#privacy">\n    Svenska ord keeps your progress and theme on this device only. No cookies, no tracking.\n  </CookieBanner>\n  <App />\n</ConsentProvider>`,
    render: () => <Stage id="notice" notice />,
  },
  {
    title: 'Cookie storage',
    description: 'storage="cookie" writes a first-party ui_consent cookie (Path=/, SameSite=Lax, Max-Age from maxAgeDays, Secure on https) so a server can read it. It is written only after you decide here, and Reset example removes it.',
    code: `<ConsentProvider storage="cookie" maxAgeDays={180} categories={categories}>\n  <CookieBanner policyHref="/privacy" />\n</ConsentProvider>`,
    render: () => <Stage id="cookie" storage="cookie" />,
  },
  {
    title: 'ConsentGate',
    description: 'Optional scripts load only after the visitor grants their category, and unmount when it is withdrawn.',
    code: `<ConsentGate category="analytics">\n  <AnalyticsScript />\n</ConsentGate>`,
    render: () => (
      <Stage id="gate">
        <Gates />
      </Stage>
    ),
  },
  {
    title: 'Reopen from a footer link',
    description: 'A decision is stored, so the banner stays away. A "Cookies and storage" link calls openSettings() to change it at any time; withdrawing takes the same steps as granting.',
    code: `const { openSettings } = useConsent();\n\n<footer>\n  <Button variant="secondary" appearance="text" size="sm" onClick={openSettings}>\n    Cookies and storage\n  </Button>\n</footer>`,
    render: () => <Stage id="reopen" seed />,
  },
];

function Gates() {
  return (
    <ul className="list-unstyled small mb-0 d-flex flex-column gap-1">
      {['analytics', 'marketing'].map((id) => (
        <li key={id}>
          <ConsentGate category={id}>
            <span>{id} script: running</span>
          </ConsentGate>
          <GateOff id={id} />
        </li>
      ))}
    </ul>
  );
}

function GateOff({ id }: { id: string }) {
  return useConsent().has(id) ? null : <span className="text-body-secondary">{id} script: not loaded</span>;
}
