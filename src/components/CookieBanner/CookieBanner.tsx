import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { useLocale } from '../../locale/LocaleProvider';
import { usePresence } from '../../motion/usePresence';
import { cx } from '../../utils/cx';
import { safeUrl } from '../../utils/url';
import { Button } from '../Button/Button';
import { Dialog } from '../Dialog/Dialog';
import { Link } from '../Link/Link';
import { Portal } from '../Portal/Portal';
import { Switch } from '../Switch/Switch';
import { resolveAutoMode, useConsent, useConsentInternals } from './ConsentProvider';
import { clearConsentOffset, setConsentOffset } from './offset';
import type { ConsentCategory, ConsentMode, ConsentRecord, CookieBannerProps } from './types';

/** Moves focus back, trying again while the dialog that is leaving still keeps the page inert. */
function restoreFocus(region: HTMLElement | null, previous: HTMLElement | null) {
  const lost = () => {
    const active = document.activeElement;
    return !active || active === document.body || !!region?.contains(active) || !!active.closest('.ui-dialog-root');
  };
  const main = (): HTMLElement | null => {
    const el = document.querySelector<HTMLElement>('main, [role="main"]');
    if (el && !el.hasAttribute('tabindex')) {
      el.setAttribute('tabindex', '-1');
      el.addEventListener('blur', () => el.removeAttribute('tabindex'), { once: true });
    }
    return el;
  };
  let tries = 0;
  const attempt = () => {
    if (!lost()) return;
    let blocked = false;
    // The element that had focus before the banner, or `main` when it is gone or cannot take focus (disabled, hidden).
    for (const el of [previous, main()]) {
      if (!el?.isConnected) continue;
      if (el.closest('[inert]')) {
        blocked = true;
        continue;
      }
      el.focus();
      if (document.activeElement === el) return;
    }
    if (blocked && tries++ < 20) window.setTimeout(attempt, 50);
  };
  attempt();
}

export function CookieBanner({ mode = 'auto', title, children, policyHref, policyLabel, placement = 'bottom', className }: CookieBannerProps) {
  const { t } = useLocale();
  const consent = useConsent();
  const { ready, record, categories, bannerForced, bannerRequest, prefsOpen, prefsKey, openPrefs, closePrefs, registerMode } = useConsentInternals();
  const titleId = useId();
  const regionRef = useRef<HTMLElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const prefsFromBanner = useRef(false);

  const hasOptional = categories.some((c) => !c.required);
  const invalidNotice = mode === 'notice' && hasOptional;
  const resolved: ConsentMode = invalidNotice ? 'consent' : mode === 'auto' ? resolveAutoMode(categories) : mode;

  useEffect(() => {
    if (invalidNotice && import.meta.env?.DEV) console.error('[react-ui-kit] CookieBanner: mode="notice" cannot be used with optional categories; showing the consent choices instead.');
  }, [invalidNotice]);

  useLayoutEffect(() => {
    registerMode(resolved);
    return () => registerMode(null);
  }, [resolved, registerMode]);

  const visible = ready && (record === null || bannerForced);
  const { present, state } = usePresence(visible);

  // The banner lives in a host that is the first child of body, so keyboard and screen-reader users reach it first.
  const [host, setHost] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (!present) return;
    const el = document.createElement('div');
    el.setAttribute('data-ui-cookie-banner-host', '');
    document.body.prepend(el);
    setHost(el);
    return () => {
      el.remove();
      setHost(null);
    };
  }, [present]);

  // Reserve the banner's height at the bottom of the page while it is visible.
  useLayoutEffect(() => {
    const el = regionRef.current;
    if (!visible || !host || !el) return;
    const id = Symbol('cookie-banner');
    const measure = () => setConsentOffset(id, el.getBoundingClientRect().height);
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(el);
    return () => {
      observer?.disconnect();
      clearConsentOffset(id);
    };
  }, [visible, host]);

  // Remember the element that had focus before focus entered the banner. The banner itself never takes focus.
  useEffect(() => {
    if (!visible) return;
    const remember = (node: EventTarget | null) => {
      if (!(node instanceof HTMLElement) || node === document.body) return;
      if (regionRef.current?.contains(node) || node.closest('[role="dialog"], [role="alertdialog"]')) return;
      previousFocus.current = node;
    };
    remember(document.activeElement);
    const onFocusIn = (event: FocusEvent) => remember(event.target);
    document.addEventListener('focusin', onFocusIn);
    return () => document.removeEventListener('focusin', onFocusIn);
  }, [visible]);

  // A reopen from openSettings() (notice mode) is a user action, so focus goes to the banner's first action: otherwise a
  // keyboard user who pressed the link at the end of a long page would have to tab back from the end. The banner never
  // does this on load. After OK, focus returns to the element above (previousFocus is the one that called openSettings).
  const handledRequest = useRef(bannerRequest);
  useEffect(() => {
    if (bannerRequest === handledRequest.current || !host || state === 'closed') return;
    const first = regionRef.current?.querySelector<HTMLElement>('.ui-cookie-banner__actions button');
    if (!first) return;
    handledRequest.current = bannerRequest;
    first.focus();
  }, [bannerRequest, host, state]);

  // After a decision, focus that was in the banner (or in the preferences opened from it) goes back where it was.
  const wasVisible = useRef(visible);
  useEffect(() => {
    const was = wasVisible.current;
    wasVisible.current = visible;
    if (!was || visible) return;
    const region = regionRef.current;
    const active = document.activeElement;
    const inside = prefsFromBanner.current || !!(active && (region?.contains(active) || active.closest('.ui-dialog-root')));
    prefsFromBanner.current = false;
    if (inside) restoreFocus(region, previousFocus.current);
  }, [visible]);

  const policy = safeUrl(policyHref);
  const message = children ?? t(resolved === 'notice' ? 'cookieNoticeMessage' : 'cookieConsentMessage');
  const buttonProps = { variant: 'secondary', appearance: 'outline', size: 'md' } as const;

  return (
    <>
      {present && host && (
        <Portal container={host}>
          <section
            ref={regionRef}
            aria-labelledby={titleId}
            data-state={state}
            inert={state === 'closed' ? true : undefined}
            className={cx('ui-cookie-banner', `ui-cookie-banner--${placement}`, className)}
          >
            <div className="ui-cookie-banner__sheet">
              <div className="ui-cookie-banner__body">
                <h2 id={titleId} className="ui-cookie-banner__title">
                  {title ?? t('cookieTitle')}
                </h2>
                <div className="ui-cookie-banner__message">
                  {message}
                  {policy && (
                    <>
                      {' '}
                      <Link href={policy} variant="body">
                        {policyLabel ?? t('cookiePolicyLabel')}
                      </Link>
                    </>
                  )}
                </div>
              </div>
              <div className={cx('ui-cookie-banner__actions', resolved === 'notice' && 'ui-cookie-banner__actions--single')}>
                {resolved === 'consent' ? (
                  <>
                    <Button {...buttonProps} className="ui-cookie-banner__button" onClick={consent.rejectAll}>
                      {t('cookieReject')}
                    </Button>
                    <Button {...buttonProps} className="ui-cookie-banner__button" onClick={consent.acceptAll}>
                      {t('cookieAccept')}
                    </Button>
                    <Button
                      variant="secondary"
                      appearance="text"
                      className="ui-cookie-banner__choose"
                      onClick={() => {
                        prefsFromBanner.current = true;
                        openPrefs();
                      }}
                    >
                      {t('cookieChoose')}
                    </Button>
                  </>
                ) : (
                  <Button {...buttonProps} className="ui-cookie-banner__button" onClick={consent.acceptAll}>
                    {t('cookieAcknowledge')}
                  </Button>
                )}
              </div>
            </div>
          </section>
        </Portal>
      )}
      <Preferences
        key={prefsKey}
        open={prefsOpen}
        categories={categories}
        record={record}
        onClose={() => {
          prefsFromBanner.current = false;
          closePrefs();
        }}
        onSave={consent.save}
      />
    </>
  );
}

interface PreferencesProps {
  open: boolean;
  categories: ConsentCategory[];
  record: ConsentRecord | null;
  onClose: () => void;
  onSave: (choices: Record<string, boolean>) => void;
}

function Preferences({ open, categories, record, onClose, onSave }: PreferencesProps) {
  const { t } = useLocale();
  const baseId = useId();
  // Starts from the stored record (or off for optional categories); the parent remounts this on every open.
  const [draft, setDraft] = useState<Record<string, boolean>>(() => Object.fromEntries(categories.map((c) => [c.id, c.required ? true : record?.categories[c.id] === true])));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('cookiePreferencesTitle')}
      size="md"
      className="ui-cookie-preferences"
      footer={<Button onClick={() => onSave(draft)}>{t('cookieSave')}</Button>}
    >
      <p className="ui-cookie-preferences__intro">{t('cookiePreferencesIntro')}</p>
      <ul className="ui-cookie-preferences__list">
        {categories.map((category) => {
          const descriptionId = `${baseId}-${category.id}-description`;
          return (
            <li key={category.id} className="ui-cookie-preferences__item">
              <Switch
                label={category.label ?? category.id}
                checked={draft[category.id] === true}
                disabled={category.required}
                aria-describedby={category.description || category.required ? descriptionId : undefined}
                onChange={(checked) => setDraft((d) => ({ ...d, [category.id]: checked }))}
              />
              {(category.description || category.required) && (
                <p id={descriptionId} className="ui-cookie-preferences__description">
                  {category.description}
                  {category.description && category.required ? ' ' : null}
                  {category.required ? t('cookieRequiredReason') : null}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </Dialog>
  );
}
