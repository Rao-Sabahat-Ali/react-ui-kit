import { useState, type ReactNode } from 'react';
import type { Profile } from '@sabahat/react-ui-kit';
import { useToast } from '@sabahat/react-ui-kit';
import { AdminListDetail } from '../../../templates/blueprints/AdminListDetail';
import { Board } from '../../../templates/blueprints/Board';
import { Checkout, type CheckoutState } from '../../../templates/blueprints/Checkout';
import { AnalyticsDashboard, DASHBOARD_WIDGETS } from '../../../templates/blueprints/AnalyticsDashboard';
import { OVERVIEW_WIDGETS, Overview } from '../../../templates/blueprints/Overview';
import { OrderDetail, type OrderDetailState } from '../../../templates/blueprints/OrderDetail';
import { REPORTS_WIDGETS, ReportsIndex } from '../../../templates/blueprints/ReportsIndex';
import { Settings } from '../../../templates/blueprints/Settings';
import { SignIn } from '../../../templates/blueprints/SignIn';
import type { WidgetState } from '../../../templates/blueprints/shared';
import { DemoShell, type DemoNavItem } from './DemoShell';

/** Raw source of every blueprint file, keyed by file name (what "Copy source" shows). */
const rawSources = import.meta.glob<string>('../../../templates/blueprints/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true });
export const sourceOf = (file: string): string => rawSources[`../../../templates/blueprints/${file}`] ?? '';

export interface PreviewChoice {
  widget: string;
  state: string;
}

export interface Blueprint {
  slug: string;
  title: string;
  summary: string;
  profile: Profile;
  /** design-system-mcp pattern slugs (`get_pattern`). */
  patterns: string[];
  /** Files copied to start an app, first is the screen. */
  files: string[];
  highlights: string[];
  /** Hint shown above the frame. */
  tryIt?: string;
  /** Demo controls: which regions can be forced into which state. */
  preview?: { widgets?: { value: string; label: string }[]; states: { value: string; label: string }[] };
  render: (preview: PreviewChoice) => ReactNode;
}

const DATA_STATES = [
  { value: 'ready', label: 'Ready' },
  { value: 'loading', label: 'Loading' },
  { value: 'empty', label: 'Empty' },
  { value: 'error', label: 'Error' },
];
const ALL = { value: 'all', label: 'All regions' };

/** Navigation inside a demo frame is not wired: say so instead of leaving the docs page. */
function useNotWired() {
  const toast = useToast();
  return (href: string) => toast.info(`${href} is not part of this blueprint`);
}

const SAAS_NAV: DemoNavItem[] = [
  { label: 'Overview', href: '/', icon: 'home', section: 'Bookkeeping' },
  { label: 'Reports', href: '/reports', icon: 'calendar', section: 'Bookkeeping' },
  { label: 'Settings', href: '/settings', icon: 'settings', section: 'Account' },
];

function OverviewIndexDemo({ preview }: { preview: PreviewChoice }) {
  const [view, setView] = useState<'/' | '/reports'>('/');
  const notWired = useNotWired();
  const state = preview.state as WidgetState;
  const overview = ['all', 'numbers', 'today'].includes(preview.widget);
  const reports = ['all', 'reports'].includes(preview.widget);
  return (
    <DemoShell brand="Kassan" nav={SAAS_NAV} active={view} onNavigate={(href) => (href === '/' || href === '/reports' ? setView(href) : notWired(href))}>
      {view === '/' ? (
        <Overview
          previewState={overview ? { widget: preview.widget as 'numbers' | 'today' | 'all', state } : undefined}
          onNavigate={(href) => (href === '/reports' ? setView('/reports') : notWired(href))}
        />
      ) : (
        <ReportsIndex previewState={reports ? { widget: 'all', state } : undefined} />
      )}
    </DemoShell>
  );
}

function SettingsDemo() {
  const notWired = useNotWired();
  return (
    <DemoShell brand="Kassan" nav={SAAS_NAV} active="/settings" onNavigate={notWired}>
      <Settings />
    </DemoShell>
  );
}

function OrderDetailDemo({ preview }: { preview: PreviewChoice }) {
  const notWired = useNotWired();
  return (
    <DemoShell
      brand="Nordic Tools"
      nav={[
        { label: 'Overview', href: '/', icon: 'home', section: 'Sales' },
        { label: 'Orders', href: '/orders', icon: 'filter', section: 'Sales' },
        { label: 'Customers', href: '/customers', icon: 'user', section: 'Sales' },
      ]}
      active="/orders"
      onNavigate={notWired}
    >
      <OrderDetail state={preview.state as OrderDetailState} onNavigate={notWired} />
    </DemoShell>
  );
}

export const blueprints: Blueprint[] = [
  {
    slug: 'analytics-dashboard',
    title: 'Analytics dashboard',
    summary: 'KPIs, trend and breakdown charts, a sortable order table and an activity feed, each widget loading independently.',
    profile: 'dashboard',
    patterns: ['dashboard-grid', 'overview'],
    files: ['AnalyticsDashboard.tsx', 'AnalyticsDashboard.data.ts', 'shared.tsx'],
    highlights: [
      'PageHeader with a date-range Select and the single ink action; a StatGroup of four KPIs with delta words and sparklines instead of tiles.',
      'Revenue line chart (this period against the previous one) and a horizontal bar chart. Both carry a text summary and a "View as table" fallback.',
      'DataTable of recent orders: sort, search (also driven by the top bar), status and channel filters, pagination, Tag statuses and an identical overflow menu on every row.',
      'Activity Timeline; Skeleton, empty and error states per widget (use the preview controls), with Retry bringing back only the failed widget.',
      'Light and dark through the theme toggle, comfortable and compact density from the display menu in the top bar.',
    ],
    tryIt: 'Switch the date range, sort or filter the table, then force a region into loading, empty or error with the controls below.',
    preview: { widgets: [ALL, ...DASHBOARD_WIDGETS], states: DATA_STATES },
    render: (p) => <AnalyticsDashboard embedded previewState={{ widget: p.widget as 'all', state: p.state as WidgetState }} />,
  },
  {
    slug: 'admin-list-detail',
    title: 'Admin list to detail',
    summary: 'A back-office invoice list with filters, bulk actions, a detail drawer and confirmed deletes.',
    profile: 'admin',
    patterns: ['list-detail', 'form-layout'],
    files: ['AdminListDetail.tsx', 'AdminListDetail.data.ts', 'shared.tsx'],
    highlights: [
      'AppShell with SidebarNav and Topbar search; PageHeader with breadcrumb and one ink action; compact density from the admin profile.',
      'DataTable (small, sticky header, sortable, paginated, multi-select). Row click opens a Drawer, so the list keeps its place; closing returns focus to the row.',
      'Selecting rows swaps the filter Toolbar for a bulk Toolbar with the count; Delete asks through a ConfirmDialog that names the object.',
      'New invoice reuses the Drawer with a form: labelled Fields, an error summary with links, focus on the first problem, Toast on save.',
      'Empty (first run), no results (filtered) and error states with a Retry.',
    ],
    tryIt: 'Open a row, select two rows for the bulk bar, delete one, or press New invoice and submit it empty.',
    preview: { states: DATA_STATES },
    render: (p) => <AdminListDetail embedded previewState={{ widget: 'all', state: p.state as WidgetState }} />,
  },
  {
    slug: 'board',
    title: 'Task board',
    summary: 'A sprint board: numbered stages, cards that move by drag, keyboard or menu, WIP limits and a details drawer.',
    profile: 'saas',
    patterns: ['list-detail'],
    files: ['Board.tsx', 'Board.data.ts', 'shared.tsx'],
    highlights: [
      'PageHeader with the single ink action (New task) and a Toolbar with the text filter; the filter hides cards, marks matches and the column counts follow.',
      'KanbanBoard with four numbered stages that assemble in order; quantity marks tick when a card moves. Doing warns over its limit of 3, Review refuses drops when full and says so.',
      'Three ways to move a card: pointer drag with a placeholder at the drop index, Space then arrow keys (one polite announcement per step), or "Move to…" in the card menu (Shift+F10).',
      'A card opens a Drawer with its details and focus returns to the card on close; New task reuses a Drawer with a labelled Field.',
      'Loading, empty and error states (preview controls); a move that your API rejects rolls the card back and offers Retry.',
    ],
    tryIt: 'Press Space on a card, move it with the arrow keys and drop it with Space; or open its menu with Shift+F10 and choose Move to…',
    preview: { states: DATA_STATES },
    render: (p) => <Board embedded previewState={{ widget: 'all', state: p.state as WidgetState }} />,
  },
  {
    slug: 'overview-index',
    title: 'Overview and index page',
    summary: 'The home screen of a SaaS app and the ruled-list index page it links to.',
    profile: 'saas',
    patterns: ['overview', 'index-page'],
    files: ['Overview.tsx', 'ReportsIndex.tsx', 'shared.tsx'],
    highlights: [
      'Overview: greeting, one ink action, a StatGroup of four numbers, a "Today" IndexList with identical outline actions, a featured deadline in a side column and a compact three-column Browse index.',
      'Index page (Reports in the sidebar): one IndexList per Section, serif row titles, description and meta; a finished row swaps its action for a success Tag instead of disappearing.',
      'No grid of equal cards, no icon tiles; loading, empty and error per region.',
    ],
    tryIt: 'Use the sidebar to move between Overview and Reports, or press a Browse row.',
    preview: { widgets: [ALL, ...OVERVIEW_WIDGETS, ...REPORTS_WIDGETS], states: DATA_STATES },
    render: (p) => <OverviewIndexDemo preview={p} />,
  },
  {
    slug: 'settings',
    title: 'Settings page',
    summary: 'Vertical tabs with grouped settings, an explicit Save with validation, instant switches and a danger zone.',
    profile: 'saas',
    patterns: ['settings-page', 'form-layout'],
    files: ['Settings.tsx'],
    highlights: [
      'Vertical Tabs from lg, a scrollable tab row below; one Section per group separated by a hairline, no boxes.',
      'Profile saves together through an explicit Save (loading state, Toast); invalid input shows field errors and an error summary, and focus moves to the first problem.',
      'Notification switches apply instantly; the theme choice is bound to ThemeProvider.',
      'Leaving a changed profile asks "Discard changes?"; the danger zone is last, separated, and names the workspace in its button and dialog.',
    ],
    tryIt: 'Clear the name and press Save changes, edit a field and switch tab, or open the Account tab.',
    render: () => <SettingsDemo />,
  },
  {
    slug: 'checkout',
    title: 'Checkout',
    summary: 'A guest-first, four-step checkout with hosted card fields, an order summary on every step and a payment result.',
    profile: 'ecommerce',
    patterns: ['checkout'],
    files: ['Checkout.tsx', 'Checkout.data.ts'],
    highlights: [
      'Linear Stepper with four steps (contact, delivery, payment, review) and a confirmation that is not a step; guest first, each step keeps its data when you go back.',
      'PaymentMethodSelector with Card, Digital wallet, Bank transfer and Invoice as ruled rows; choosing Card reveals PaymentCardForm in hosted mode, with a simulated provider so no card data ever reaches the page.',
      'OrderSummary on every step: a real table in the right column from lg, a "Show summary 86,40 kr" bar below; the total change is announced and the final button carries the amount.',
      'PaymentStatus for processing, 3-D Secure (requires action), declined (keeps your details, Try again or Use another method) and the confirmation with a tabular order reference.',
      'UI only: the server creates the payment, recomputes amounts, handles 3-D Secure and confirms by webhook. Test data only.',
    ],
    tryIt: 'Use any email, a test card 4242 4242 4242 4242 with any future date and any 3 digits, then Place order. Switch the preview to try loading totals, a declined first attempt or 3-D Secure.',
    preview: {
      states: [
        { value: 'ready', label: 'Ready' },
        { value: 'loading', label: 'Loading totals' },
        { value: 'failed', label: 'Declined' },
        { value: 'requires-action', label: '3-D Secure' },
      ],
    },
    render: (p) => <Checkout previewState={{ state: p.state as CheckoutState }} />,
  },
  {
    slug: 'sign-in',
    title: 'Sign in and reset',
    summary: 'A standalone sign-in page with password reset, using the auth and form-layout patterns.',
    profile: 'saas',
    patterns: ['auth', 'form-layout'],
    files: ['SignIn.tsx'],
    highlights: [
      'Single centred column, no shell navigation; the card title is the page h1.',
      'Email with autocomplete "username", Password with "current-password" (and "new-password" plus live requirements on reset); paste and password managers work.',
      'Generic messages: wrong credentials never say which part is wrong, reset always shows the same confirmation.',
      'Submit stays enabled and shows a loading state; invalid input focuses the first field.',
    ],
    tryIt: 'Sign in with any email and the password wrong-password to see the generic error, or press Forgot password.',
    render: () => <SignIn />,
  },
  {
    slug: 'article-detail',
    title: 'Article and detail page',
    summary: 'A page about one thing, an order, using the page itself as the container.',
    profile: 'saas',
    patterns: ['article-detail'],
    files: ['OrderDetail.tsx'],
    highlights: [
      'PageHeader with back link, meta Tags and one ink action; hairline-separated Sections for summary, items, delivery and notes.',
      'Comparable facts in a plain, captioned table with right-aligned numbers; prose capped at 70ch.',
      'A follow toggle with aria-pressed and an Undo Toast; loading and not-found states (preview controls).',
    ],
    tryIt: 'Press Follow order and use Undo, or switch the preview to Not found.',
    preview: {
      states: [
        { value: 'ready', label: 'Ready' },
        { value: 'loading', label: 'Loading' },
        { value: 'not-found', label: 'Not found' },
      ],
    },
    render: (p) => <OrderDetailDemo preview={p} />,
  },
];

export const findBlueprint = (slug: string | undefined) => blueprints.find((b) => b.slug === slug);
