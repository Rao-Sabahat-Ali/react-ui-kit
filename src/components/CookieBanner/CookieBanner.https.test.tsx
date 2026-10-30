// @vitest-environment-options {"url": "https://example.test/"}
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConsentProvider } from './ConsentProvider';
import { CookieBanner } from './CookieBanner';

afterEach(() => {
  vi.restoreAllMocks();
  document.cookie = 'ui_consent=; Path=/; Max-Age=0; Secure';
});

describe('CookieBanner on https', () => {
  it('AC-10: storage="cookie" adds Secure on https and reads the cookie back', async () => {
    expect(window.location.protocol).toBe('https:');
    const setter = vi.spyOn(Document.prototype, 'cookie', 'set');
    render(
      <ConsentProvider storage="cookie">
        <CookieBanner />
      </ConsentProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(setter.mock.calls[0]![0]).toMatch(/^ui_consent=[^;]+; Path=\/; SameSite=Lax; Max-Age=31536000; Secure$/);
    expect(document.cookie).toContain('ui_consent=');
  });
});
