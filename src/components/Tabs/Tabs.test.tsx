import type { ComponentProps } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../../locale';
import { Tabs } from './Tabs';

function Example(props: Partial<ComponentProps<typeof Tabs>>) {
  return (
    <Tabs defaultValue="a" {...props}>
      <Tabs.List aria-label="Settings">
        <Tabs.Tab value="a">General</Tabs.Tab>
        <Tabs.Tab value="b" disabled>Billing</Tabs.Tab>
        <Tabs.Tab value="c">Security</Tabs.Tab>
        <Tabs.Tab value="d">Advanced</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="a">General panel</Tabs.Panel>
      <Tabs.Panel value="b">Billing panel</Tabs.Panel>
      <Tabs.Panel value="c">Security panel</Tabs.Panel>
      <Tabs.Panel value="d">Advanced panel</Tabs.Panel>
    </Tabs>
  );
}

const tab = (name: string) => screen.getByRole('tab', { name });

describe('Tabs', () => {
  it('AC-1: roles and aria relationships', () => {
    render(<Example />);
    expect(screen.getByRole('tablist', { name: 'Settings' })).toBeInTheDocument();
    expect(tab('General')).toHaveAttribute('aria-selected', 'true');
    const panel = screen.getByRole('tabpanel', { name: 'General' });
    expect(tab('General')).toHaveAttribute('aria-controls', panel.id);
  });

  it('AC-2: click activates and fires onChange', async () => {
    const onChange = vi.fn();
    render(<Example onChange={onChange} />);
    await userEvent.click(tab('Security'));
    expect(onChange).toHaveBeenCalledWith('c');
    expect(screen.getByRole('tabpanel', { name: 'Security' })).toBeVisible();
    expect(screen.queryByText('General panel')).not.toBeVisible();
  });

  it('AC-3: arrows move and activate, wrap and skip disabled', async () => {
    render(<Example />);
    tab('General').focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(tab('Security')).toHaveFocus();
    expect(tab('Security')).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    expect(tab('General')).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(tab('Advanced')).toHaveFocus();
  });

  it('AC-4: Home and End', async () => {
    render(<Example />);
    tab('General').focus();
    await userEvent.keyboard('{End}');
    expect(tab('Advanced')).toHaveFocus();
    await userEvent.keyboard('{Home}');
    expect(tab('General')).toHaveFocus();
  });

  it('AC-5: manual activation requires Enter/Space', async () => {
    render(<Example activation="manual" />);
    tab('General').focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(tab('Security')).toHaveFocus();
    expect(tab('Security')).toHaveAttribute('aria-selected', 'false');
    await userEvent.keyboard('{Enter}');
    expect(tab('Security')).toHaveAttribute('aria-selected', 'true');
  });

  it('AC-6: only active tab is tabbable', () => {
    render(<Example />);
    expect(tab('General')).toHaveAttribute('tabindex', '0');
    expect(tab('Security')).toHaveAttribute('tabindex', '-1');
  });

  it('AC-7: lazy panels render only after first activation', async () => {
    render(<Example />);
    expect(screen.queryByText('Security panel')).toBeNull();
    await userEvent.click(tab('Security'));
    await userEvent.click(tab('General'));
    expect(screen.getByText('Security panel')).toBeInTheDocument();
  });

  it('AC-8: items API', () => {
    render(<Tabs aria-label="Data" items={[{ value: 'x', label: 'X', content: 'X content' }, { value: 'y', label: 'Y', content: 'Y content' }]} />);
    expect(screen.getByRole('tablist', { name: 'Data' })).toBeInTheDocument();
    expect(tab('X')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('X content')).toBeInTheDocument();
  });

  it('AC-9: variant maps to nav classes', () => {
    render(<Example variant="pills" />);
    expect(screen.getByRole('tablist')).toHaveClass('nav-pills');
  });

  describe('scrollable', () => {
    const originals = new Map<string, PropertyDescriptor | undefined>();
    const define = (name: string, value: unknown) => {
      originals.set(name, Object.getOwnPropertyDescriptor(HTMLElement.prototype, name));
      Object.defineProperty(HTMLElement.prototype, name, { configurable: true, writable: true, value });
    };
    const overflowing = (scrollLeft = 0) => {
      define('scrollWidth', 1000);
      define('clientWidth', 300);
      define('scrollLeft', scrollLeft);
    };
    const scrollBy = vi.fn();
    afterEach(() => {
      for (const [name, d] of originals) {
        if (d) Object.defineProperty(HTMLElement.prototype, name, d);
        else delete (HTMLElement.prototype as unknown as Record<string, unknown>)[name];
      }
      originals.clear();
      scrollBy.mockReset();
      vi.unstubAllGlobals();
    });
    const withScrollBy = () => {
      define('scrollBy', scrollBy);
    };

    it('AC-10: scroll buttons exist only while the tabs overflow, labelled from the locale', () => {
      const { unmount } = render(<Example scrollable />);
      expect(screen.queryByRole('button', { name: /scroll tabs/i })).toBeNull();
      unmount();
      overflowing();
      render(
        <LocaleProvider locale="en" messages={{ tabsScrollBack: 'Earlier tabs', tabsScrollForward: 'Later tabs' }}>
          <Example scrollable />
        </LocaleProvider>,
      );
      expect(screen.getByRole('button', { name: 'Earlier tabs' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Later tabs' })).toBeInTheDocument();
      expect(screen.getByRole('tablist')).toHaveClass('ui-tabs__list--scrollable');
    });

    it('AC-11: scroll buttons are real buttons outside the tab order and scroll by most of a page', async () => {
      overflowing(100);
      withScrollBy();
      render(<Example scrollable />);
      const next = screen.getByRole('button', { name: 'Scroll tabs forward' });
      expect(next.tagName).toBe('BUTTON');
      expect(next).toHaveAttribute('tabindex', '-1');
      await userEvent.click(next);
      expect(scrollBy).toHaveBeenLastCalledWith(expect.objectContaining({ left: 225 }));
      await userEvent.click(screen.getByRole('button', { name: 'Scroll tabs back' }));
      expect(scrollBy).toHaveBeenLastCalledWith(expect.objectContaining({ left: -225 }));
    });

    it('AC-12: the button at an edge is disabled', () => {
      overflowing(0);
      const { unmount } = render(<Example scrollable />);
      expect(screen.getByRole('button', { name: 'Scroll tabs back' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Scroll tabs forward' })).toBeEnabled();
      unmount();
      overflowing(700);
      render(<Example scrollable />);
      expect(screen.getByRole('button', { name: 'Scroll tabs forward' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Scroll tabs back' })).toBeEnabled();
    });

    it('AC-13: a selected or keyboard-focused tab that is out of view is scrolled into view', async () => {
      overflowing();
      withScrollBy();
      const rect = (left: number, right: number) => ({ left, right, top: 0, bottom: 10, width: right - left, height: 10, x: left, y: 0, toJSON: () => ({}) }) as DOMRect;
      vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
        if (this.classList.contains('ui-tabs__viewport')) return rect(0, 300);
        if (this.textContent === 'Advanced') return rect(500, 600);
        return rect(0, 100);
      });
      render(<Example scrollable />);
      tab('General').focus();
      scrollBy.mockClear();
      await userEvent.keyboard('{End}');
      expect(tab('Advanced')).toHaveFocus();
      expect(scrollBy).toHaveBeenCalledWith(expect.objectContaining({ left: 304 }));
      vi.restoreAllMocks();
    });

    it('AC-14: scrolling is instant under prefers-reduced-motion and the buttons mirror in RTL', async () => {
      overflowing(100);
      withScrollBy();
      vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
      render(
        <div dir="rtl" style={{ direction: 'rtl' }}>
          <Example scrollable />
        </div>,
      );
      await userEvent.click(screen.getByRole('button', { name: 'Scroll tabs forward' }));
      expect(scrollBy).toHaveBeenLastCalledWith({ left: -225, behavior: 'auto' });
    });

    it('AC-15: scrollable is ignored for vertical tabs and works without ResizeObserver', () => {
      overflowing();
      vi.stubGlobal('ResizeObserver', undefined);
      const { unmount } = render(<Example scrollable orientation="vertical" />);
      expect(screen.queryByRole('button', { name: /scroll tabs/i })).toBeNull();
      unmount();
      render(<Example scrollable />);
      expect(screen.getByRole('button', { name: 'Scroll tabs forward' })).toBeInTheDocument();
      act(() => {
        fireEvent.scroll(document.querySelector('.ui-tabs__viewport')!);
      });
    });
  });
});
