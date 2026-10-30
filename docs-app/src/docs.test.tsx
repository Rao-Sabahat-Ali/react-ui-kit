import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { blueprints } from './blueprints/registry';

const open = (hash: string) => {
  window.location.hash = hash;
};

beforeEach(() => {
  window.scrollTo = () => {};
  localStorage.clear();
  document.documentElement.removeAttribute('data-bs-theme');
});
afterEach(() => {
  window.location.hash = '';
});

describe('docs home', () => {
  it('starts with the numbered install steps, shows one live action and no icon stat strip', async () => {
    open('#/');
    render(<App />);
    expect(screen.queryByText('Themes (light, dark)')).toBeNull();
    const sheet = screen.getByRole('list', { name: 'Use in an app' });
    // Only the current step offers an action: no dead (inert, dimmed) buttons on the others.
    expect(within(sheet).getAllByRole('button', { name: 'Continue' })).toHaveLength(1);
    await userEvent.click(within(sheet).getByRole('button', { name: 'Continue' }));
    expect(within(sheet).getAllByRole('listitem')[1]).toHaveAttribute('aria-current', 'step');
    expect(within(sheet).getAllByRole('button', { name: 'Continue' })).toHaveLength(1);
    await userEvent.click(within(sheet).getByRole('button', { name: 'Continue' }));
    expect(within(sheet).getByRole('link', { name: /Browse foundations/ })).toBeVisible();
    expect(screen.queryByText('Tip')).toBeNull();
  });
});

describe('component page', () => {
  it('writes category and status as a plain text line, not tags', async () => {
    open('#/components/step-sheet');
    const { container } = render(<App />);
    expect(await screen.findByRole('heading', { level: 1, name: 'StepSheet' })).toBeInTheDocument();
    expect(container.querySelector('.docs-page-header .ui-tag')).toBeNull();
    expect(screen.getByText(/Panel · implemented · spec/)).toBeInTheDocument();
  });
});

describe('profile default theme', () => {
  it('adopts the profile default until the visitor picks a theme', async () => {
    open('#/');
    render(<App />);
    await userEvent.click(screen.getByRole('combobox', { name: 'App profile' }));
    await userEvent.click(screen.getByRole('option', { name: 'game' }));
    expect(document.documentElement).toHaveAttribute('data-bs-theme', 'dark');
    await userEvent.click(screen.getByRole('combobox', { name: 'App profile' }));
    await userEvent.click(screen.getByRole('option', { name: 'pos' }));
    expect(document.documentElement).toHaveAttribute('data-bs-theme', 'light');
  });

  it('keeps an explicit pick across profiles', async () => {
    localStorage.setItem('ui:theme', 'dark');
    open('#/');
    render(<App />);
    await userEvent.click(screen.getByRole('combobox', { name: 'App profile' }));
    await userEvent.click(screen.getByRole('option', { name: 'pos' }));
    expect(document.documentElement).toHaveAttribute('data-bs-theme', 'dark');
  });
});

describe('profiles page', () => {
  it('shows structure per profile, not only hues', async () => {
    open('#/profiles');
    render(<App />);
    expect(await screen.findByRole('heading', { level: 2, name: 'pos' })).toBeInTheDocument();
    for (const label of ['Default theme', 'Density', 'Touch target', 'Controls', 'Radius', 'Motion']) {
      expect(screen.getAllByText(label)).toHaveLength(8);
    }
    expect(screen.getAllByText('spacious').length).toBeGreaterThan(0);
  });
});

describe('blueprint page', () => {
  it('keeps one Docs entry whose drawer holds the profile select (and the theme toggle when the screen has none)', async () => {
    act(() => open('#/blueprints/checkout'));
    const { container } = render(<App />);
    await screen.findByText('Sample data.');
    const drawer = container.querySelector('#docs-nav')!;
    const tools = drawer.querySelector('.docs-nav__tools')!;
    expect(within(tools as HTMLElement).getByRole('combobox', { name: 'App profile' })).toBeInTheDocument();
    expect(tools.querySelector('button[aria-label*="mode" i]')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Docs menu', expanded: false })).toBeInTheDocument();
  });

  it('draws checkout figures without text or quantity marks', async () => {
    act(() => open('#/blueprints/checkout'));
    const { container } = render(<App />);
    await screen.findByText('Sample data.');
    const svg = await vi.waitFor(() => {
      const el = container.querySelector('svg[data-fig-ok], .docs-blueprint__frame svg[focusable="false"]');
      if (!el) throw new Error('no figure yet');
      return el;
    });
    expect(svg.querySelector('text')).toBeNull();
  });

  it('labels the preview as sample data', async () => {
    act(() => open(`#/blueprints/${blueprints[0]!.slug}`));
    render(<App />);
    expect(await screen.findByText('Sample data.')).toBeInTheDocument();
  });
});

describe('cookie notice', () => {
  it('shows a notice on the first visit, OK stores the record, and the sidebar link shows it again', async () => {
    open('#/');
    render(<App />);
    const notice = screen.getByRole('region', { name: 'Cookies and storage' });
    expect(within(notice).getByText(/No cookies, no tracking\./)).toBeInTheDocument();
    expect(within(notice).getByRole('link', { name: 'Privacy and cookies' })).toHaveAttribute('href', '#/privacy');
    await userEvent.click(within(notice).getByRole('button', { name: 'OK' }));
    expect(screen.queryByRole('region', { name: 'Cookies and storage' })).toBeNull();
    expect(JSON.parse(localStorage.getItem('ui:consent')!)).toMatchObject({ version: '2026-10', mode: 'notice' });
    await userEvent.click(within(screen.getByRole('navigation', { name: 'Docs' })).getByRole('button', { name: 'Cookies and storage' }));
    expect(screen.getByRole('region', { name: 'Cookies and storage' })).toBeInTheDocument();
  });

  it('the Privacy page names every key the docs always store', async () => {
    open('#/privacy');
    render(<App />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Privacy' })).toBeInTheDocument();
    for (const key of ['ui:theme', 'docs:profile', 'ui:consent']) expect(screen.getByRole('rowheader', { name: key })).toBeInTheDocument();
  });
});
