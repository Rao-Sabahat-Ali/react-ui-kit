import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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
  it('labels the preview as sample data', async () => {
    act(() => open(`#/blueprints/${blueprints[0]!.slug}`));
    render(<App />);
    expect(await screen.findByText('Sample data.')).toBeInTheDocument();
  });
});
