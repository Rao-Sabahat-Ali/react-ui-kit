import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { compileScss, mediaBlock } from '../../../test/scss';
import { ConsentGate } from './ConsentGate';
import { ConsentProvider, useConsent } from './ConsentProvider';
import { CookieBanner } from './CookieBanner';
import type { ConsentCategory, ConsentProviderProps, ConsentRecord, CookieBannerProps } from './types';

const KEY = 'test:consent';
const CATEGORIES: ConsentCategory[] = [
  { id: 'necessary', label: 'Necessary', description: 'Sign-in and your settings.', required: true },
  { id: 'analytics', label: 'Analytics', description: 'Anonymous page counts.' },
  { id: 'marketing', label: 'Marketing', description: 'Measures campaigns.' },
];

const record = (over: Partial<ConsentRecord> = {}): ConsentRecord => ({
  version: '1',
  decidedAt: new Date().toISOString(),
  mode: 'consent',
  categories: { necessary: true, analytics: false, marketing: false },
  ...over,
});
const seed = (value: unknown = record()) => localStorage.setItem(KEY, typeof value === 'string' ? value : JSON.stringify(value));
const stored = (): ConsentRecord | null => {
  const raw = localStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as ConsentRecord) : null;
};

function Probe() {
  const consent = useConsent();
  return (
    <div>
      <output aria-label="analytics granted">{String(consent.has('analytics'))}</output>
      <button type="button" onClick={consent.openSettings}>
        Cookies and storage settings
      </button>
      <button type="button" onClick={() => consent.save({ analytics: false })}>
        Withdraw analytics
      </button>
      <ConsentGate category="analytics">
        <p>Analytics loaded</p>
      </ConsentGate>
    </div>
  );
}

function Harness({ banner, ...provider }: ConsentProviderProps & { banner?: CookieBannerProps }) {
  return (
    <ConsentProvider categories={CATEGORIES} policyVersion="1" storageKey={KEY} {...provider}>
      <button type="button">Before</button>
      <CookieBanner policyHref="/privacy" {...banner} />
      <Probe />
      <main>Page</main>
    </ConsentProvider>
  );
}

const region = () => screen.queryByRole('region', { name: 'Cookies and storage' });
const reduceMotion = (reduced: boolean) => {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) => ({ matches: reduced && query.includes('prefers-reduced-motion'), media: query, onchange: null, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn() }) as unknown as MediaQueryList,
  );
};
const clearCookie = () => {
  document.cookie = 'ui_consent=; Path=/; Max-Age=0';
};

beforeEach(() => {
  clearCookie();
});
afterEach(() => {
  vi.restoreAllMocks();
  clearCookie();
  document.documentElement.removeAttribute('style');
});

describe('CookieBanner', () => {
  it('AC-1: renders a region named by its title without a record, nothing with a valid one', () => {
    const { unmount } = render(<Harness />);
    expect(region()).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Cookies and storage' })).toBeInTheDocument();
    unmount();
    seed();
    render(<Harness />);
    expect(region()).toBeNull();
  });

  it('AC-2: an outdated, expired, malformed or unreadable record shows the banner again and never throws', () => {
    const cases: [string, unknown][] = [
      ['other policyVersion', record({ version: '0' })],
      ['older than maxAgeDays', record({ decidedAt: new Date(Date.now() - 400 * 86_400_000).toISOString() })],
      ['dated in the future', record({ decidedAt: new Date(Date.now() + 30 * 86_400_000).toISOString() })],
      ['unparseable', '{not json'],
      ['wrong shape', { version: '1', decidedAt: 'yesterday', mode: 'consent', categories: {} }],
      ['non-boolean category', record({ categories: { necessary: 'yes' } as unknown as Record<string, boolean> })],
      ['an array', []],
    ];
    for (const [label, value] of cases) {
      localStorage.clear();
      seed(value);
      const { unmount } = render(<Harness />);
      expect(region(), label).toBeInTheDocument();
      unmount();
    }
    localStorage.clear();
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    render(<Harness />);
    expect(region()).toBeInTheDocument();
  });

  it('AC-2: a decision still hides the banner for this page when storage is blocked', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Accept all' }));
    expect(region()).toBeNull();
    expect(screen.getByLabelText('analytics granted')).toHaveTextContent('true');
  });

  it('AC-3: consent mode offers Reject all, Accept all and Choose; the first two are the same button; none is focused', () => {
    render(<Harness />);
    const reject = screen.getByRole('button', { name: 'Reject all' });
    const accept = screen.getByRole('button', { name: 'Accept all' });
    expect(screen.getByRole('button', { name: 'Choose…' })).toBeInTheDocument();
    expect(reject.className).toBe(accept.className);
    expect(reject.compareDocumentPosition(accept) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(region()!).getAllByRole('button').some((b) => b === document.activeElement)).toBe(false);
    expect(document.activeElement).toBe(document.body);
  });

  it('AC-4: Accept all and Reject all store version, decidedAt and mode, call onChange once and hide the banner', async () => {
    const onChange = vi.fn();
    const { unmount } = render(<Harness onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Accept all' }));
    const accepted = stored()!;
    expect(accepted.categories).toEqual({ necessary: true, analytics: true, marketing: true });
    expect(accepted.version).toBe('1');
    expect(accepted.mode).toBe('consent');
    expect(new Date(accepted.decidedAt).toISOString()).toBe(accepted.decidedAt);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(accepted);
    expect(region()).toBeNull();
    unmount();

    localStorage.clear();
    const onReject = vi.fn();
    render(<Harness onChange={onReject} />);
    await userEvent.click(screen.getByRole('button', { name: 'Reject all' }));
    expect(stored()!.categories).toEqual({ necessary: true, analytics: false, marketing: false });
    expect(onReject).toHaveBeenCalledTimes(1);
    expect(region()).toBeNull();
  });

  it('AC-5: Choose opens the preferences with one switch per category; Save stores exactly the switches; Escape stores nothing', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Choose…' }));
    const dialog = screen.getByRole('dialog', { name: 'Cookie preferences' });
    const switches = within(dialog).getAllByRole('switch');
    expect(switches).toHaveLength(3);
    const necessary = within(dialog).getByRole('switch', { name: 'Necessary' });
    expect(necessary).toBeChecked();
    expect(necessary).toBeDisabled();
    expect(within(dialog).getByRole('switch', { name: 'Analytics' })).not.toBeChecked();
    expect(within(dialog).getByRole('switch', { name: 'Marketing' })).not.toBeChecked();
    expect(within(dialog).getByText(/Always on/)).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(stored()).toBeNull();
    expect(region()).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Choose…' }));
    await userEvent.click(screen.getByRole('switch', { name: 'Analytics' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save choices' }));
    expect(stored()!.categories).toEqual({ necessary: true, analytics: true, marketing: false });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(region()).toBeNull();
  });

  it('AC-5: reopened preferences reflect the stored record', async () => {
    seed(record({ categories: { necessary: true, analytics: true, marketing: false } }));
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Cookies and storage settings' }));
    expect(screen.getByRole('switch', { name: 'Analytics' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Marketing' })).not.toBeChecked();
  });

  it('AC-6: notice mode has one acknowledge button and the policy link, no choices, and stores a notice record', async () => {
    const onChange = vi.fn();
    render(
      <ConsentProvider policyVersion="1" storageKey={KEY} onChange={onChange}>
        <CookieBanner policyHref="/privacy" />
      </ConsentProvider>,
    );
    const banner = region()!;
    expect(within(banner).getAllByRole('button')).toHaveLength(1);
    expect(within(banner).getByRole('link', { name: 'Privacy and cookies' })).toHaveAttribute('href', '/privacy');
    expect(within(banner).queryByRole('button', { name: 'Choose…' })).toBeNull();
    expect(within(banner).queryByRole('switch')).toBeNull();
    await userEvent.click(within(banner).getByRole('button', { name: 'OK' }));
    expect(stored()).toMatchObject({ mode: 'notice', version: '1', categories: { necessary: true } });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(region()).toBeNull();
  });

  it('AC-6: mode="notice" with optional categories logs a development error and falls back to consent mode', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<Harness banner={{ mode: 'notice' }} />);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('CookieBanner'));
    expect(screen.getByRole('button', { name: 'Reject all' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'OK' })).toBeNull();
  });

  it('AC-7: mode="auto" is notice when every category is required and consent otherwise', () => {
    const { unmount } = render(
      <ConsentProvider categories={[{ id: 'necessary', required: true }, { id: 'prefs', required: true }]} storageKey={KEY}>
        <CookieBanner mode="auto" />
      </ConsentProvider>,
    );
    expect(screen.getByRole('button', { name: 'OK' })).toBeInTheDocument();
    unmount();
    render(<Harness banner={{ mode: 'auto' }} />);
    expect(screen.getByRole('button', { name: 'Reject all' })).toBeInTheDocument();
  });

  it('AC-8: has() reflects the record; ConsentGate mounts after the grant and unmounts when it is withdrawn', async () => {
    render(<Harness />);
    expect(screen.queryByText('Analytics loaded')).toBeNull();
    expect(screen.getByLabelText('analytics granted')).toHaveTextContent('false');
    await userEvent.click(screen.getByRole('button', { name: 'Accept all' }));
    expect(screen.getByText('Analytics loaded')).toBeInTheDocument();
    expect(screen.getByLabelText('analytics granted')).toHaveTextContent('true');
    await userEvent.click(screen.getByRole('button', { name: 'Withdraw analytics' }));
    expect(screen.queryByText('Analytics loaded')).toBeNull();
    expect(stored()!.categories.analytics).toBe(false);
  });

  it('AC-9: openSettings reopens the preferences (consent) and withdrawing takes the same three steps as granting', async () => {
    seed(record({ categories: { necessary: true, analytics: true, marketing: false } }));
    render(<Harness />);
    expect(region()).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Cookies and storage settings' }));
    expect(screen.getByRole('dialog', { name: 'Cookie preferences' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('switch', { name: 'Analytics' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save choices' }));
    expect(stored()!.categories.analytics).toBe(false);
    // Granting again: open, switch, save.
    await userEvent.click(screen.getByRole('button', { name: 'Cookies and storage settings' }));
    await userEvent.click(screen.getByRole('switch', { name: 'Analytics' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save choices' }));
    expect(stored()!.categories.analytics).toBe(true);
  });

  it('AC-9: openSettings shows the banner again in notice mode', async () => {
    seed(record({ mode: 'notice', categories: { necessary: true } }));
    render(
      <ConsentProvider policyVersion="1" storageKey={KEY}>
        <CookieBanner />
        <Probe />
      </ConsentProvider>,
    );
    expect(region()).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Cookies and storage settings' }));
    expect(region()).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(region()).toBeNull();
  });

  it('AC-10: storage="cookie" writes ui_consent with Path, SameSite and Max-Age, reads it back, and writes no localStorage', async () => {
    const setter = vi.spyOn(Document.prototype, 'cookie', 'set');
    render(<Harness storage="cookie" maxAgeDays={30} />);
    await userEvent.click(screen.getByRole('button', { name: 'Accept all' }));
    expect(setter).toHaveBeenCalledTimes(1);
    const written = setter.mock.calls[0]![0];
    expect(written).toMatch(/^ui_consent=[^;]+; Path=\/; SameSite=Lax; Max-Age=2592000$/);
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(document.cookie).toContain('ui_consent=');
    expect(region()).toBeNull();

    // A fresh page reads the cookie back.
    document.body.innerHTML = '';
    render(<Harness storage="cookie" maxAgeDays={30} />);
    expect(region()).toBeNull();
    expect(screen.getByLabelText('analytics granted')).toHaveTextContent('true');
  });

  it('AC-10: the default writes only localStorage and no cookie', async () => {
    const setter = vi.spyOn(Document.prototype, 'cookie', 'set');
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Accept all' }));
    expect(setter).not.toHaveBeenCalled();
    expect(stored()).not.toBeNull();
  });

  it('AC-11: a decision from another tab updates useConsent and hides the banner', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    expect(region()).toBeInTheDocument();
    const next = record({ categories: { necessary: true, analytics: true, marketing: false } });
    act(() => {
      seed(next);
      window.dispatchEvent(new StorageEvent('storage', { key: KEY, newValue: JSON.stringify(next) }));
    });
    expect(region()).toBeNull();
    expect(screen.getByText('Analytics loaded')).toBeInTheDocument();
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(next);
  });

  it('AC-12: --ui-consent-offset equals the banner height, with matching padding, and all of it goes when it hides', async () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const height = this.classList.contains('ui-cookie-banner') ? 120 : 0;
      return { height, width: 0, top: 0, left: 0, right: 0, bottom: height, x: 0, y: 0, toJSON: () => ({}) };
    });
    const root = document.documentElement;
    root.style.setProperty('padding-bottom', '4px');
    render(<Harness />);
    expect(root.style.getPropertyValue('--ui-consent-offset')).toBe('120px');
    expect(root.style.getPropertyValue('padding-bottom')).toBe('120px');
    expect(root.style.getPropertyValue('scroll-padding-bottom')).toBe('120px');
    await userEvent.click(screen.getByRole('button', { name: 'Reject all' }));
    expect(root.style.getPropertyValue('--ui-consent-offset')).toBe('');
    expect(root.style.getPropertyValue('scroll-padding-bottom')).toBe('');
    expect(root.style.getPropertyValue('padding-bottom')).toBe('4px');
  });

  it('AC-13: focus inside the banner returns to the previously focused element after a decision; nothing moves focus on load', async () => {
    render(<Harness />);
    const before = screen.getByRole('button', { name: 'Before' });
    act(() => before.focus());
    expect(before).toHaveFocus();
    await userEvent.click(screen.getByRole('button', { name: 'Accept all' }));
    expect(region()).toBeNull();
    expect(before).toHaveFocus();
  });

  it('AC-13: with nothing focused before, focus goes to main; also after a decision made in the preferences', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Choose…' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save choices' }));
    await waitFor(() => expect(screen.getByRole('main')).toHaveFocus());
  });

  it('AC-13: when the previously focused element can no longer take focus (disabled), focus goes to main', async () => {
    render(<Harness />);
    const before = screen.getByRole('button', { name: 'Before' });
    act(() => before.focus());
    before.setAttribute('disabled', '');
    await userEvent.click(screen.getByRole('button', { name: 'Accept all' }));
    await waitFor(() => expect(screen.getByRole('main')).toHaveFocus());
  });

  it('AC-13: keyboard only: the banner is the first tab stop, never grabbed focus, and Enter on Accept all moves focus on', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(document.body).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('link', { name: 'Privacy and cookies' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Reject all' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Accept all' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(region()).toBeNull();
    await waitFor(() => expect(screen.getByRole('main')).toHaveFocus());
  });

  it('AC-14: policyHref passes through safeUrl; an unsafe URL renders no link', () => {
    const { unmount } = render(<Harness banner={{ policyHref: '/privacy#cookies' }} />);
    expect(within(region()!).getByRole('link', { name: 'Privacy and cookies' })).toHaveAttribute('href', '/privacy#cookies');
    unmount();
    render(<Harness banner={{ policyHref: 'javascript:alert(1)' }} />);
    expect(within(region()!).queryByRole('link')).toBeNull();
  });

  it('AC-15: under reduced motion the stylesheet fades in and out within 120 ms with no transform, and the banner leaves at once', async () => {
    const css = compileScss('src/components/CookieBanner/CookieBanner.scss');
    const reduced = mediaBlock(css, '(prefers-reduced-motion: reduce)');
    expect(reduced).toContain('ui-fade-in 120ms');
    expect(reduced).toContain('ui-fade-out 120ms');
    expect(reduced).not.toMatch(/transform|translate|scale/);
    expect(css.replace(reduced, '')).toMatch(/ui-cookie-banner-in[\s\S]*transform/);

    reduceMotion(true);
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Accept all' }));
    expect(region()).toBeNull();
  });

  it('AC-16: renders nothing and reads no storage on the server, then appears after hydration without a warning', async () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem');
    const cookie = vi.spyOn(Document.prototype, 'cookie', 'get');
    const html = renderToString(<Harness />);
    expect(html).not.toContain('ui-cookie-banner');
    expect(getItem).not.toHaveBeenCalled();
    expect(cookie).not.toHaveBeenCalled();

    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const container = document.createElement('div');
    container.innerHTML = html;
    document.body.append(container);
    await act(async () => {
      hydrateRoot(container, <Harness />);
    });
    expect(error).not.toHaveBeenCalled();
    expect(region()).toBeInTheDocument();
    container.remove();
  });
});
