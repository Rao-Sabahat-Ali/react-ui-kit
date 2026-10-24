import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Tour, type TourProps } from './Tour';

const steps: TourProps['steps'] = [
  { target: '#a', title: 'First', content: 'Click here first.', placement: 'bottom' },
  { target: '#b', title: 'Second', content: 'Then here.' },
  { target: '#c', title: 'Third', content: 'Finally here.' },
];

const Page = ({ children }: { children?: React.ReactNode }) => (
  <>
    <button id="before">before</button>
    <button id="a">A</button>
    <button id="b">B</button>
    <div id="c" data-testid="c">
      C (not focusable)
    </div>
    <button id="after">after</button>
    {children}
  </>
);

const dialog = () => screen.getByRole('dialog');
const next = () => fireEvent.click(screen.getByRole('button', { name: 'Next' }));

describe('Tour', () => {
  let scrollIntoView: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView as unknown as typeof Element.prototype.scrollIntoView;
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('AC-1: renders a dialog named by the title, described by the content, with a step counter; closed renders nothing', () => {
    const { rerender } = render(
      <Page>
        <Tour steps={steps} />
      </Page>,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    rerender(
      <Page>
        <Tour steps={steps} open />
      </Page>,
    );
    const d = dialog();
    expect(d).toHaveAccessibleName('First');
    expect(d).toHaveAccessibleDescription('Click here first.');
    expect(d).toHaveTextContent('Step 1 of 3');
  });

  it('AC-1: falls back to the label when a step has no title', () => {
    render(<Page><Tour open steps={[{ target: '#a', content: 'Hi' }]} label="Welcome tour" /></Page>);
    expect(dialog()).toHaveAccessibleName('Welcome tour');
  });

  it('AC-2: focus moves into the panel on open and each step, and is restored on close', () => {
    const { rerender } = render(
      <Page>
        <Tour steps={steps} />
      </Page>,
    );
    const opener = document.getElementById('before')!;
    opener.focus();
    rerender(
      <Page>
        <Tour steps={steps} open />
      </Page>,
    );
    expect(dialog()).toHaveFocus();
    screen.getByRole('button', { name: 'Next' }).focus();
    next();
    expect(dialog()).toHaveAccessibleName('Second');
    expect(dialog()).toHaveFocus();
    rerender(
      <Page>
        <Tour steps={steps} open={false} />
      </Page>,
    );
    expect(opener).toHaveFocus();
  });

  it('AC-3: Previous/Next/Done navigate and onStepChange fires; Previous absent first, Done replaces Next last', () => {
    const onStepChange = vi.fn();
    const onClose = vi.fn();
    render(<Page><Tour defaultOpen steps={steps} onStepChange={onStepChange} onClose={onClose} /></Page>);
    expect(screen.queryByRole('button', { name: 'Previous' })).toBeNull();
    next();
    expect(onStepChange).toHaveBeenLastCalledWith(1, steps[1]);
    expect(screen.getByRole('button', { name: 'Previous' })).toBeInTheDocument();
    next();
    expect(dialog()).toHaveTextContent('Step 3 of 3');
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(onStepChange).toHaveBeenLastCalledWith(1, steps[1]);
    next();
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(onClose).toHaveBeenCalledWith('done');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('AC-4: Escape, Skip and Done close with their reason and call onOpenChange(false)', () => {
    const onClose = vi.fn();
    const onOpenChange = vi.fn();
    const { unmount } = render(<Page><Tour defaultOpen steps={steps} onClose={onClose} onOpenChange={onOpenChange} /></Page>);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenLastCalledWith('escape');
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    unmount();
    render(<Page><Tour defaultOpen steps={steps} onClose={onClose} /></Page>);
    fireEvent.click(screen.getByRole('button', { name: 'Skip tour' }));
    expect(onClose).toHaveBeenLastCalledWith('skip');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('AC-5: a ring overlays the target, ignores pointer events and there is no backdrop or blur', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      return this.id === 'a' ? ({ top: 100, left: 50, width: 80, height: 30, right: 130, bottom: 130, x: 50, y: 100, toJSON: () => ({}) } as DOMRect) : ({ top: 0, left: 0, width: 200, height: 100, right: 200, bottom: 100, x: 0, y: 0, toJSON: () => ({}) } as DOMRect);
    });
    render(<Page><Tour defaultOpen steps={steps} ringPadding={4} /></Page>);
    const ring = document.querySelector('.ui-tour__ring') as HTMLElement;
    expect(ring).toBeInTheDocument();
    expect(ring.style.top).toBe('96px');
    expect(ring.style.left).toBe('46px');
    expect(ring.style.width).toBe('88px');
    expect(ring.style.height).toBe('38px');
    const scss = readFileSync(join(__dirname, 'Tour.scss'), 'utf8');
    expect(scss).toMatch(/\.ui-tour__ring\s*{[^}]*pointer-events:\s*none/s);
    expect(scss).not.toMatch(/blur|backdrop-filter|backdrop/);
    expect(document.querySelector('.modal-backdrop, .ui-backdrop, .ui-tour__backdrop')).toBeNull();
  });

  it('AC-6: targets can be a selector, a ref or a function and are scrolled into view', () => {
    const ref = createRef<HTMLElement>();
    const refSteps: TourProps['steps'] = [
      { target: '#a', content: 'selector' },
      { target: ref as React.RefObject<HTMLElement | null>, content: 'ref' },
      { target: () => document.getElementById('c'), content: 'function' },
    ];
    render(
      <Page>
        <button ref={ref as React.RefObject<HTMLButtonElement>} id="by-ref">
          ref target
        </button>
        <Tour defaultOpen steps={refSteps} />
      </Page>,
    );
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center', inline: 'nearest', behavior: 'smooth' });
    next();
    expect(dialog()).toHaveTextContent('ref');
    next();
    expect(dialog()).toHaveTextContent('function');
    expect(scrollIntoView).toHaveBeenCalledTimes(3);
  });

  it('AC-6: scrolls instantly under reduced motion', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false }));
    render(<Page><Tour defaultOpen steps={steps} /></Page>);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center', inline: 'nearest', behavior: 'auto' });
  });

  it('AC-7: a missing target is skipped with a dev-only warning; no targets closes the tour', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const onStepChange = vi.fn();
    const onClose = vi.fn();
    const withMissing: TourProps['steps'] = [{ target: '#a', title: 'One', content: 'x' }, { target: '#missing', title: 'Gone', content: 'x' }, { target: '#b', title: 'Three', content: 'x' }];
    const { unmount } = render(<Page><Tour defaultOpen steps={withMissing} onStepChange={onStepChange} onClose={onClose} /></Page>);
    next();
    expect(dialog()).toHaveAccessibleName('Three');
    expect(onStepChange).toHaveBeenLastCalledWith(2, withMissing[2]);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]![0])).toContain('step 2');
    // Going back skips it again, in the direction of travel.
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(dialog()).toHaveAccessibleName('One');
    unmount();

    warn.mockClear();
    render(<Page><Tour defaultOpen steps={[{ target: '#nope', content: 'x' }, { target: '.also-nope', content: 'y' }]} onClose={onClose} /></Page>);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onClose).toHaveBeenCalledWith('done');
    expect(warn).toHaveBeenCalled();
  });

  it('AC-7: no console warning outside development', () => {
    vi.stubEnv('DEV', false);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<Page><Tour defaultOpen steps={[{ target: '#missing', content: 'x' }, { target: '#a', content: 'ok' }]} /></Page>);
    expect(dialog()).toHaveTextContent('ok');
    expect(warn).not.toHaveBeenCalled();
  });

  it('AC-8: open/defaultOpen and step/defaultStep work controlled and uncontrolled', () => {
    const onStepChange = vi.fn();
    const { rerender } = render(<Page><Tour open step={1} steps={steps} onStepChange={onStepChange} /></Page>);
    expect(dialog()).toHaveAccessibleName('Second');
    next();
    expect(onStepChange).toHaveBeenCalledWith(2, steps[2]);
    expect(dialog()).toHaveAccessibleName('Second');
    rerender(<Page><Tour open step={2} steps={steps} onStepChange={onStepChange} /></Page>);
    expect(dialog()).toHaveAccessibleName('Third');
    rerender(<Page><Tour open={false} step={2} steps={steps} /></Page>);
    expect(screen.queryByRole('dialog')).toBeNull();
    rerender(<Page><Tour defaultOpen defaultStep={2} steps={steps} key="u" /></Page>);
    expect(dialog()).toHaveAccessibleName('Third');
  });

  it('AC-9: non-modal: no aria-modal, no inert, no scroll lock, and Tab past the last control goes to the target', () => {
    render(<Page><Tour defaultOpen steps={steps} /></Page>);
    expect(dialog()).not.toHaveAttribute('aria-modal');
    expect(document.querySelector('[inert]')).toBeNull();
    expect(document.body.style.overflow).not.toBe('hidden');
    const nextButton = screen.getByRole('button', { name: 'Next' });
    nextButton.focus();
    fireEvent.keyDown(nextButton, { key: 'Tab' });
    expect(document.getElementById('a')).toHaveFocus();
    // Shift+Tab from the panel goes back to the target as well.
    dialog().focus();
    fireEvent.keyDown(dialog(), { key: 'Tab', shiftKey: true });
    expect(document.getElementById('a')).toHaveFocus();
    // A non-focusable target: continue after it.
    document.getElementById('a')!.focus();
    next();
    next();
    screen.getByRole('button', { name: 'Done' }).focus();
    fireEvent.keyDown(screen.getByRole('button', { name: 'Done' }), { key: 'Tab' });
    expect(document.getElementById('after')).toHaveFocus();
  });

  it('AC-10: positioned beside the target with data-placement; Escape is handled by the top-most overlay only', () => {
    const onCloseA = vi.fn();
    const onCloseB = vi.fn();
    render(
      <Page>
        <Tour open steps={[{ target: '#a', content: 'outer', placement: 'top' }]} onClose={onCloseA} />
        <Tour open steps={[{ target: '#b', content: 'inner' }]} onClose={onCloseB} />
      </Page>,
    );
    const dialogs = screen.getAllByRole('dialog');
    expect(dialogs[0]).toHaveAttribute('data-placement');
    expect(dialogs[0]!.style.position).toBe('fixed');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCloseB).toHaveBeenCalledTimes(1);
    expect(onCloseA).not.toHaveBeenCalled();
    act(() => void 0);
  });
});
