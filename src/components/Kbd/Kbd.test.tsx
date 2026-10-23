import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { LocaleProvider } from '../../locale/LocaleProvider';
import { Kbd, formatShortcut } from './Kbd';

function setPlatform(value: string) {
  Object.defineProperty(window.navigator, 'platform', { value, configurable: true });
}

describe('Kbd', () => {
  afterEach(() => setPlatform(''));

  it('AC-1: renders outer kbd.ui-kbd with inner kbd.ui-kbd__key elements', () => {
    const { container } = render(<Kbd keys={['Ctrl', 'K']} platform="other" />);
    const outer = container.querySelector('kbd.ui-kbd') as HTMLElement;
    const inner = outer.querySelectorAll('kbd.ui-kbd__key');
    expect(inner).toHaveLength(2);
    expect(inner[0]).toHaveTextContent('Ctrl');
    expect(inner[1]).toHaveTextContent('K');
  });

  it('AC-2: other platform renders Mod as Ctrl with aria-hidden "+" separator', () => {
    const { container } = render(<Kbd keys={['Mod', 'K']} platform="other" />);
    expect(screen.getByText('Ctrl')).toBeInTheDocument();
    const sep = container.querySelector('.ui-kbd__separator');
    expect(sep).toHaveTextContent('+');
    expect(sep).toHaveAttribute('aria-hidden', 'true');
  });

  it('AC-3: apple platform renders Mod as ⌘ with aria-label and no separator', () => {
    const { container } = render(<Kbd keys={['Mod', 'K']} platform="apple" />);
    expect(screen.getByText('⌘')).toHaveAttribute('aria-label', 'Command');
    expect(container.querySelector('.ui-kbd__separator')).toBeNull();
  });

  it('AC-4: auto platform resolves from navigator.platform', () => {
    setPlatform('MacIntel');
    const first = render(<Kbd keys="Mod" />);
    expect(screen.getByText('⌘')).toBeInTheDocument();
    first.unmount();
    setPlatform('Win32');
    render(<Kbd keys="Mod" />);
    expect(screen.getByText('Ctrl')).toBeInTheDocument();
  });

  it('AC-5: single string key renders one key; letters are upper-cased', () => {
    const { container, rerender } = render(<Kbd keys="Escape" platform="other" />);
    expect(container.querySelectorAll('.ui-kbd__key')).toHaveLength(1);
    expect(screen.getByText('Esc')).toBeInTheDocument();
    rerender(<Kbd keys="k" platform="other" />);
    expect(screen.getByText('K')).toBeInTheDocument();
  });

  it('AC-6: unknown key names render verbatim', () => {
    render(<Kbd keys="PageDown" platform="other" />);
    expect(screen.getByText('PageDown')).toBeInTheDocument();
  });

  it('AC-7: formatShortcut returns label and aria-keyshortcuts', () => {
    expect(formatShortcut(['Mod', 'K'], 'apple')).toEqual({ label: '⌘K', ariaKeyShortcuts: 'Meta+K' });
    expect(formatShortcut(['Mod', 'K'], 'other')).toEqual({ label: 'Ctrl+K', ariaKeyShortcuts: 'Control+K' });
  });

  it('AC-8: key names come from LocaleProvider messages', () => {
    render(
      <LocaleProvider locale="de" messages={{ keyCtrl: 'Strg' }}>
        <Kbd keys={['Mod', 'K']} platform="other" />
      </LocaleProvider>,
    );
    expect(screen.getByText('Strg')).toBeInTheDocument();
  });

  it('AC-9: component is not focusable', () => {
    const { container } = render(<Kbd keys={['Ctrl', 'K']} platform="other" />);
    expect(container.querySelector('[tabindex]')).toBeNull();
  });
});
