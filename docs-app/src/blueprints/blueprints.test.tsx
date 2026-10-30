import type { ReactNode } from 'react';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider, ToastProvider, type Profile } from '@sabahat/react-ui-kit';
import { AdminListDetail } from '../../../templates/blueprints/AdminListDetail';
import { Checkout } from '../../../templates/blueprints/Checkout';
import { AnalyticsDashboard, DASHBOARD_WIDGETS as DASHBOARD_TEMPLATE_WIDGETS } from '../../../templates/blueprints/AnalyticsDashboard';
import { OrderDetail } from '../../../templates/blueprints/OrderDetail';
import { Overview, OVERVIEW_WIDGETS as OVERVIEW_TEMPLATE_WIDGETS } from '../../../templates/blueprints/Overview';
import { ReportsIndex, REPORTS_WIDGETS as REPORTS_TEMPLATE_WIDGETS } from '../../../templates/blueprints/ReportsIndex';
import { Settings } from '../../../templates/blueprints/Settings';
import { SignIn } from '../../../templates/blueprints/SignIn';
import { blueprints, DASHBOARD_WIDGETS, loadSource, OVERVIEW_WIDGETS, REPORTS_WIDGETS } from './registry';

function setViewport(desktop: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('min-width') ? desktop : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

const wrap = (node: ReactNode, profile: Profile = 'saas') => (
  <ThemeProvider profile={profile} theme="light">
    <ToastProvider>{node}</ToastProvider>
  </ThemeProvider>
);

let errors: ReturnType<typeof vi.spyOn>;
let warnings: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  setViewport(true);
  errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  warnings = vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  errors.mockRestore();
  warnings.mockRestore();
});

/** Headings in DOM order never skip a level (h1 → h2 → h3, may go back up). */
function expectOrderedHeadings() {
  const levels = screen.getAllByRole('heading').map((h) => Number(h.tagName.slice(1)));
  expect(levels[0]).toBe(1);
  levels.forEach((level, i) => {
    if (i > 0) expect(level, `heading #${i} (h${level}) after h${levels[i - 1]}`).toBeLessThanOrEqual(levels[i - 1]! + 1);
  });
}

it('the registry keeps its own copy of the preview region choices equal to the templates', () => {
  expect(DASHBOARD_WIDGETS).toEqual(DASHBOARD_TEMPLATE_WIDGETS);
  expect(OVERVIEW_WIDGETS).toEqual(OVERVIEW_TEMPLATE_WIDGETS);
  expect(REPORTS_WIDGETS).toEqual(REPORTS_TEMPLATE_WIDGETS);
});

describe.each(blueprints)('blueprint $slug (smoke)', (blueprint) => {
  it('renders one h1, ordered headings, one main landmark and no console errors', async () => {
    render(wrap(blueprint.render({ widget: 'all', state: 'ready' }), blueprint.profile));
    await screen.findByRole('main'); // the screen is its own lazily loaded chunk
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expectOrderedHeadings();
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(errors).not.toHaveBeenCalled();
    expect(warnings).not.toHaveBeenCalled();
  });

  it('has its source ready to copy and every file imports only the kit', async () => {
    for (const file of blueprint.files) {
      const source = await loadSource(file);
      expect(source.length, file).toBeGreaterThan(100);
      const imports = [...source.matchAll(/from '([^']+)'/g)].map((m) => m[1]!);
      for (const spec of imports) expect(spec === 'react' || spec === '@sabahat/react-ui-kit' || spec.startsWith('./'), `${file} imports ${spec}`).toBe(true);
    }
  });

  it.each(blueprint.preview?.states.filter((s) => s.value !== 'ready') ?? [])('survives the $value preview state', async (state) => {
    render(wrap(blueprint.render({ widget: 'all', state: state.value }), blueprint.profile));
    await screen.findAllByRole('heading', { level: 1 });
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expectOrderedHeadings();
    expect(errors).not.toHaveBeenCalled();
  });
});

describe('analytics dashboard', () => {
  const renderDashboard = (props = {}) => render(wrap(<AnalyticsDashboard {...props} />, 'dashboard'));

  it('names its landmarks and regions, and gives data an accessible alternative', async () => {
    renderDashboard();
    expect(document.querySelector('header.ui-topbar')).not.toBeNull();
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
    for (const name of ['Revenue over time', 'Orders by channel', 'Recent orders', 'Activity']) expect(screen.getByRole('region', { name })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Key metrics' })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Recent orders' })).toBeInTheDocument();
    // Every chart exposes a text summary and a table view.
    expect(screen.getAllByRole('button', { name: 'View as table' })).toHaveLength(2);
    expect(screen.getByText(/Revenue totalled SEK/)).toBeInTheDocument();
    expect(screen.getByText(/is the largest channel/)).toBeInTheDocument();
    // Deltas announce direction in words, never colour only.
    expect(screen.getAllByText(/(Up|Down) [\d.]+% vs previous period/).length).toBeGreaterThanOrEqual(4);
  });

  it('has exactly one solid button in the page header and identical row actions', () => {
    renderDashboard();
    const header = screen.getByRole('heading', { level: 1 }).closest('header')!;
    expect(within(header).getByRole('button', { name: 'Export report' })).toHaveClass('btn-primary');
    const rowButtons = screen.getAllByRole('button', { name: /^Actions for ORD-/ });
    expect(rowButtons).toHaveLength(10);
    expect(new Set(rowButtons.map((b) => b.className)).size).toBe(1);
  });

  it('changes figures with the date range and opens the same menu on every row', async () => {
    const user = userEvent.setup();
    renderDashboard();
    const before = screen.getByText(/Revenue totalled/).textContent;
    await user.click(screen.getByRole('combobox', { name: 'Date range' }));
    await user.click(screen.getByRole('option', { name: 'Last 7 days' }));
    expect(screen.getByText(/Revenue totalled/).textContent).not.toBe(before);
    await user.click(screen.getAllByRole('button', { name: /^Actions for ORD-/ })[0]!);
    expect(screen.getAllByRole('menuitem').map((m) => m.textContent)).toEqual(['View order', 'Send receipt', 'Refund order']);
  });

  it('sorts, filters and paginates the orders table', async () => {
    const user = userEvent.setup();
    renderDashboard();
    const table = screen.getByRole('table', { name: 'Recent orders' });
    expect(within(table).getAllByRole('row')).toHaveLength(11);
    await user.click(screen.getByRole('button', { name: 'Page 2' }));
    expect(screen.getByText(/11–20 of 64/)).toBeInTheDocument();
    await user.type(screen.getByRole('searchbox', { name: 'Search orders' }), 'Lindqvist');
    expect(screen.queryByText('Berg & Söner')).not.toBeInTheDocument();
  });

  it('shows skeleton, empty and error per widget and recovers one widget at a time', async () => {
    const user = userEvent.setup();
    const { rerender } = renderDashboard({ previewState: { widget: 'revenue', state: 'loading' } });
    expect(screen.getAllByRole('status').some((el) => el.textContent === 'Loading revenue chart')).toBe(true);
    // Other widgets keep working.
    expect(screen.getByRole('table', { name: 'Recent orders' })).toBeInTheDocument();
    rerender(wrap(<AnalyticsDashboard previewState={{ widget: 'channels', state: 'empty' }} />, 'dashboard'));
    expect(screen.getByRole('heading', { level: 3, name: 'No orders in this period' })).toBeInTheDocument();
    rerender(wrap(<AnalyticsDashboard previewState={{ widget: 'activity', state: 'error' }} />, 'dashboard'));
    expect(screen.getByText('Activity did not load')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(screen.queryByText('Activity did not load')).not.toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Recent activity' })).toBeInTheDocument();
  });

  it('switches density from the display menu', async () => {
    const user = userEvent.setup();
    const { container } = renderDashboard();
    await user.click(screen.getByRole('button', { name: 'Density' }));
    await user.click(screen.getByRole('menuitemradio', { name: 'Compact' }));
    expect(container.querySelector('[data-ui-density="compact"]')).not.toBeNull();
  });
});

describe('admin list to detail', () => {
  const renderAdmin = (props = {}) => render(wrap(<AdminListDetail {...props} />, 'admin'));

  it('has one ink button, a captioned table, a breadcrumb and a status Tag with text', () => {
    renderAdmin();
    const header = screen.getByRole('heading', { level: 1, name: 'Invoices' }).closest('header')!;
    expect(within(header).getByRole('button', { name: 'New invoice' })).toHaveClass('btn-primary');
    expect(within(header).getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Invoices' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Actions for INV-/ })).toHaveLength(10);
  });

  it('opens the detail drawer on row click and keeps the list behind it', async () => {
    const user = userEvent.setup();
    renderAdmin();
    await user.click(screen.getByRole('cell', { name: 'INV-1048' }));
    const drawer = await screen.findByRole('dialog', { name: 'Invoice INV-1048' });
    expect(within(drawer).getByRole('table', { name: 'Lines on invoice INV-1048' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('swaps the filter bar for a bulk toolbar and confirms deletes by name', async () => {
    const user = userEvent.setup();
    renderAdmin();
    const boxes = screen.getAllByRole('checkbox', { name: /Select row/ });
    await user.click(boxes[0]!);
    await user.click(boxes[1]!);
    const bulk = screen.getByRole('toolbar', { name: 'Bulk actions' });
    expect(within(bulk).getByRole('status')).toHaveTextContent('2 selected');
    await user.click(within(bulk).getByRole('button', { name: 'Delete' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete invoices?' });
    expect(dialog).toHaveTextContent('2 invoices');
    expect(within(dialog).getByRole('button', { name: 'Delete 2 invoices' })).toHaveClass('btn-danger');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('table', { name: 'Invoices' })).toBeInTheDocument();
  });

  it('validates the new invoice form with an error summary', async () => {
    const user = userEvent.setup();
    renderAdmin();
    await user.click(screen.getByRole('button', { name: 'New invoice' }));
    const drawer = await screen.findByRole('dialog', { name: 'New invoice' });
    await user.click(within(drawer).getByRole('button', { name: 'Save invoice' }));
    expect(await within(drawer).findByText('3 problems need fixing')).toBeInTheDocument();
    expect(within(drawer).getByRole('link', { name: 'Choose a client' })).toBeInTheDocument();
  });

  it('shows empty, loading and error states', () => {
    const { rerender } = renderAdmin({ previewState: { widget: 'all', state: 'empty' } });
    expect(screen.getByRole('heading', { level: 3, name: 'No invoices yet' })).toBeInTheDocument();
    rerender(wrap(<AdminListDetail previewState={{ widget: 'all', state: 'error' }} />, 'admin'));
    expect(screen.getByText('Invoices did not load')).toBeInTheDocument();
    rerender(wrap(<AdminListDetail previewState={{ widget: 'all', state: 'loading' }} />, 'admin'));
    expect(screen.getByRole('table', { name: 'Invoices' })).toHaveAttribute('aria-busy', 'true');
  });
});

describe('sign in', () => {
  it('shows a generic error and never reveals which part was wrong', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(wrap(<SignIn />));
    await user.type(screen.getByLabelText(/Email/), 'alva@nordictools.example');
    await user.type(screen.getByLabelText(/^Password/), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });
    expect(screen.getByText('Email or password is incorrect.').closest('[role="alert"]')).not.toBeNull();
    vi.useRealTimers();
  });

  it('always gives the same reset confirmation', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(wrap(<SignIn />));
    await user.click(screen.getByRole('button', { name: 'Forgot password?' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Reset your password' })).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Email/), 'nobody@example.com');
    await user.click(screen.getByRole('button', { name: 'Send reset link' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });
    expect(screen.getByText(/If an account exists for that email/)).toBeInTheDocument();
    vi.useRealTimers();
  });
});

const inMain = (node: ReactNode) => wrap(<main>{node}</main>);

describe('overview and index page', () => {
  it('only promises tasks while the Today list shows them', () => {
    const { rerender } = render(inMain(<Overview />));
    expect(screen.getByText(/Three things need you/)).toBeInTheDocument();
    rerender(inMain(<Overview previewState={{ widget: 'today', state: 'empty' }} />));
    expect(screen.queryByText(/Three things need you/)).toBeNull();
    expect(screen.getByText(/Nothing needs you before the VAT return/)).toBeInTheDocument();
  });

  it('shows numbers as a named group, a ruled Today list and one ink action', () => {
    render(inMain(<Overview />));
    expect(screen.getByRole('group', { name: 'Business at a glance' })).toBeInTheDocument();
    const today = screen.getByRole('region', { name: 'Today' });
    expect(within(today).getAllByRole('listitem')).toHaveLength(3);
    expect(
      within(today)
        .getAllByRole('heading', { level: 3 })
        .map((h) => h.textContent),
    ).toEqual(['Match receipts', 'Approve supplier invoices', 'Remind overdue customers']);
    // Identical outline actions on every row.
    const actions = within(today).getAllByRole('button');
    expect(new Set(actions.map((b) => b.className)).size).toBe(1);
    expect(document.querySelectorAll('.btn-primary')).toHaveLength(1);
    expect(screen.getByRole('region', { name: 'Browse' })).toBeInTheDocument();
  });

  it('forwards a Browse row to onNavigate instead of leaving the page', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(inMain(<Overview onNavigate={onNavigate} />));
    await user.click(screen.getByRole('link', { name: 'Reports' }));
    expect(onNavigate).toHaveBeenCalledWith('/reports');
  });

  it('degrades per region: the numbers can fail while the Today list stays usable', async () => {
    const user = userEvent.setup();
    render(inMain(<Overview previewState={{ widget: 'numbers', state: 'error' }} />));
    expect(screen.getByText('Numbers did not load')).toBeInTheDocument();
    expect(screen.getByText('Match receipts')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(screen.getByRole('group', { name: 'Business at a glance' })).toBeInTheDocument();
  });

  it('index page: one list per Section and a finished row shows a Tag instead of the action', () => {
    render(inMain(<ReportsIndex />));
    expect(screen.getAllByRole('region')).toHaveLength(2);
    const tax = screen.getByRole('region', { name: 'Tax and filings' });
    expect(within(tax).getByText('Submitted')).toBeInTheDocument();
    expect(within(tax).getAllByRole('button')).toHaveLength(2);
    expect(within(tax).getAllByRole('heading', { level: 3 })).toHaveLength(3);
  });
});

describe('settings page', () => {
  it('keeps Save explicit, validates with a linked error summary and focuses the first problem', async () => {
    const user = userEvent.setup();
    render(inMain(<Settings />));
    expect(screen.getByRole('tablist')).toHaveAttribute('aria-orientation', 'vertical');
    const name = screen.getByLabelText(/Full name/);
    await user.clear(name);
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(screen.getByText('1 problem needs fixing')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Enter your name' })).toBeInTheDocument();
    expect(name).toHaveFocus();
  });

  it('asks before discarding unsaved profile changes when switching sections', async () => {
    const user = userEvent.setup();
    render(inMain(<Settings />));
    await user.type(screen.getByLabelText(/Full name/), ' Maria');
    await user.click(screen.getByRole('tab', { name: 'Notifications' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Discard changes?' });
    await user.click(within(dialog).getByRole('button', { name: 'Keep editing' }));
    expect(screen.getByRole('tab', { name: 'Profile' })).toHaveAttribute('aria-selected', 'true');
    await user.click(screen.getByRole('tab', { name: 'Notifications' }));
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Discard changes' }));
    expect(screen.getByRole('tab', { name: 'Notifications' })).toHaveAttribute('aria-selected', 'true');
  });

  it('applies switches instantly and names the workspace in the danger zone', async () => {
    const user = userEvent.setup();
    render(inMain(<Settings defaultSection="notifications" />));
    const news = screen.getByRole('switch', { name: 'Send product news' });
    expect(news).not.toBeChecked();
    await user.click(news);
    expect(news).toBeChecked();
    await user.click(screen.getByRole('tab', { name: 'Account' }));
    const zone = screen.getByRole('region', { name: 'Danger zone' });
    await user.click(within(zone).getByRole('button', { name: 'Delete workspace Nordic Tools AB' }));
    expect(await screen.findByRole('alertdialog', { name: 'Delete workspace Nordic Tools AB?' })).toBeInTheDocument();
  });
});

describe('article / detail page', () => {
  it('uses a back link first, one h1, a captioned table and hairline Sections', () => {
    render(inMain(<OrderDetail />));
    const links = screen.getAllByRole('link');
    expect(links[0]).toHaveTextContent('Orders');
    expect(screen.getByRole('heading', { level: 1, name: 'Order ORD-2561' })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Items in order ORD-2561' })).toBeInTheDocument();
    // Every region is named, including the keyboard-focusable scroll container around the table.
    expect(screen.getAllByRole('region').every((r) => r.getAttribute('aria-labelledby') || r.getAttribute('aria-label'))).toBe(true);
    expect(document.querySelectorAll('.btn-primary')).toHaveLength(1);
  });

  it('follow toggle exposes aria-pressed and offers Undo', async () => {
    const user = userEvent.setup();
    render(inMain(<OrderDetail />));
    const follow = screen.getByRole('button', { name: 'Follow order' });
    expect(follow).toHaveAttribute('aria-pressed', 'false');
    await user.click(follow);
    // The accessible name stays stable; aria-pressed carries the state and the visible label swaps.
    expect(follow).toHaveAttribute('aria-pressed', 'true');
    expect(follow).toHaveTextContent('Following');
    await user.click(await screen.findByRole('button', { name: 'Undo' }));
    expect(follow).toHaveAttribute('aria-pressed', 'false');
  });

  it('keeps one h1 in the loading and not-found states', () => {
    const { rerender } = render(inMain(<OrderDetail state="loading" />));
    expect(screen.getByRole('heading', { level: 1, name: 'Loading order' })).toBeInTheDocument();
    rerender(inMain(<OrderDetail state="not-found" />));
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 2, name: 'We could not find that order' })).toBeInTheDocument();
  });
});

describe('checkout', () => {
  const renderCheckout = (props = {}) => render(wrap(<Checkout {...props} />, 'ecommerce'));
  const CARD = '4242424242424242'; // published TEST number

  async function toPayment(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByRole('textbox', { name: /Email/ }), 'ada@example.com');
    await user.click(screen.getByRole('button', { name: 'Continue as guest' }));
    await user.type(screen.getByRole('textbox', { name: /Full name/ }), 'Ada Lovelace');
    await user.type(screen.getByRole('textbox', { name: /^Address/ }), 'Storgatan 1');
    await user.type(screen.getByRole('textbox', { name: /Postcode/ }), '11122');
    await user.type(screen.getByRole('textbox', { name: /City/ }), 'Stockholm');
    await user.click(screen.getByRole('button', { name: 'Continue to payment' }));
  }
  async function payWithCard(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByRole('textbox', { name: 'Card number' }), CARD);
    await user.type(screen.getByRole('textbox', { name: 'Expiry date' }), '1230');
    await user.type(screen.getByRole('textbox', { name: 'Security code' }), '123');
    await user.click(screen.getByRole('button', { name: 'Review order' }));
  }

  it('has a minimal header, a linear stepper with four steps and the summary on every step', () => {
    renderCheckout();
    expect(screen.getByText('Secure checkout')).toBeInTheDocument();
    const steps = document.querySelectorAll('.ui-stepper__step');
    expect(steps).toHaveLength(4);
    expect(screen.getByRole('listitem', { current: 'step' })).toHaveTextContent('Contact');
    expect(screen.getByRole('table', { name: 'Order summary' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue as guest' })).toHaveClass('btn-primary');
  });

  it('validates the contact step and focuses the first invalid field', async () => {
    const user = userEvent.setup();
    renderCheckout();
    await user.click(screen.getByRole('button', { name: 'Continue as guest' }));
    expect(screen.getByText('Enter an email like name@example.com')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Email/ })).toHaveFocus();
  });

  it('rejects emails with whitespace or several @ signs and accepts a plain address', async () => {
    const user = userEvent.setup();
    renderCheckout();
    const email = screen.getByRole('textbox', { name: /Email/ });
    for (const bad of ['a b@example.com', 'a@@example.com', 'a@b@example.com', 'ada@example', 'ada@.']) {
      await user.clear(email);
      await user.type(email, bad);
      await user.click(screen.getByRole('button', { name: 'Continue as guest' }));
      expect(screen.getByText('Enter an email like name@example.com'), bad).toBeInTheDocument();
    }
    await user.clear(email);
    await user.type(email, 'ada@example.com');
    await user.click(screen.getByRole('button', { name: 'Continue as guest' }));
    expect(screen.queryByText('Enter an email like name@example.com')).toBeNull();
  });

  it('walks contact, delivery, payment and review, updates the total and places the order', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderCheckout();
    await toPayment(user);
    expect(screen.getByRole('radiogroup', { name: 'Payment method' })).toBeInTheDocument();
    // Card is preselected: its hosted slots are mounted, and the page holds no card inputs of its own.
    expect(screen.getByRole('group', { name: 'Card number' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Review order' }));
    expect(screen.getAllByText(/incomplete|Enter/).length).toBeGreaterThan(0);
    await payWithCard(user);
    expect(screen.getByRole('button', { name: /Place order · 86,40/ })).toHaveClass('btn-primary');
    expect(screen.getAllByRole('button', { name: /^Edit / })).toHaveLength(3);
    await user.click(screen.getByRole('button', { name: /Place order · 86,40/ }));
    expect(screen.getByRole('status', { busy: true })).toHaveTextContent('Processing your payment');
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(screen.getByRole('heading', { level: 1, name: 'Order confirmed' })).toBeInTheDocument();
    expect(screen.getByText('ORD-48213')).toBeInTheDocument();
    expectOrderedHeadings();
    vi.useRealTimers();
  });

  it('shows the amount for the chosen delivery method and announces the new total', async () => {
    const user = userEvent.setup();
    renderCheckout();
    await user.type(screen.getByRole('textbox', { name: /Email/ }), 'ada@example.com');
    await user.click(screen.getByRole('button', { name: 'Continue as guest' }));
    expect(within(screen.getByRole('table')).getByRole('rowheader', { name: 'Shipping' }).closest('tr')).toHaveTextContent('4,00');
    await user.click(screen.getByRole('radio', { name: /Express/ }));
    expect(within(screen.getByRole('table')).getByRole('rowheader', { name: 'Total' }).closest('tr')).toHaveTextContent('91,40');
    expect(screen.getByText(/Total updated to 91,40/)).toBeInTheDocument();
  });

  it('reveals the card form only for Card and never renders raw card inputs', async () => {
    const user = userEvent.setup();
    renderCheckout();
    await toPayment(user);
    expect(document.querySelector('[autocomplete="cc-number"]')?.closest('.ui-hosted-field__control')).not.toBeNull();
    await user.click(screen.getByRole('radio', { name: /Digital wallet/ }));
    expect(screen.queryByRole('group', { name: 'Card number' })).toBeNull();
    expect(screen.getByText(/wallet app after you place the order/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Review order' }));
    expect(screen.getByRole('button', { name: /Place order/ })).toBeInTheDocument();
  });

  it('keeps the entered data when the first payment is declined and lets you retry or change method', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderCheckout({ previewState: { state: 'failed' } });
    await toPayment(user);
    await payWithCard(user);
    await user.click(screen.getByRole('button', { name: /Place order/ }));
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(screen.getByRole('heading', { name: 'Payment failed' }).closest('[role="alert"]')).not.toBeNull();
    await user.click(screen.getByRole('button', { name: 'Use another method' }));
    expect(screen.getByRole('radiogroup', { name: 'Payment method' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Review order' }));
    await user.click(screen.getByRole('button', { name: /Place order/ }));
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(screen.getByRole('heading', { level: 1, name: 'Order confirmed' })).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('asks for 3-D Secure confirmation before succeeding', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderCheckout({ previewState: { state: 'requires-action' } });
    await toPayment(user);
    await user.click(screen.getByRole('radio', { name: /Invoice/ }));
    await user.click(screen.getByRole('button', { name: 'Review order' }));
    await user.click(screen.getByRole('button', { name: /Place order/ }));
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(screen.getByRole('heading', { name: 'Confirm your payment' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirm payment' }));
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(screen.getByText('ORD-48213')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('shows skeleton totals while loading and writes no card data anywhere', async () => {
    const user = userEvent.setup();
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    renderCheckout({ previewState: { state: 'loading' } });
    expect(screen.getAllByRole('status').some((s) => s.textContent === 'Loading order summary')).toBe(true);
    expect(screen.queryByRole('table')).toBeNull();
    await user.type(screen.getByRole('textbox', { name: /Email/ }), 'ada@example.com');
    expect(setItem).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
    setItem.mockRestore();
    log.mockRestore();
  });
});
