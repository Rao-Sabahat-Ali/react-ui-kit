import { lazy, Suspense, type ComponentType } from 'react';
import type { Blueprint, PreviewChoice } from './types';

export type { Blueprint, PreviewChoice } from './types';

/*
 * Blueprint metadata for the docs. Importing this file is cheap: every screen and every source file is a separate chunk loaded
 * when its blueprint opens (the screen) or its "Copy source" section appears (the source).
 */

/** Raw source of every blueprint file, keyed by file name (what "Copy source" shows), loaded on demand. */
const rawSources = import.meta.glob<string>('../../../templates/blueprints/*.{ts,tsx}', { query: '?raw', import: 'default' });
export const loadSource = async (file: string): Promise<string> => (await rawSources[`../../../templates/blueprints/${file}`]?.()) ?? '';

const screens = import.meta.glob<{ default: ComponentType<PreviewChoice> }>('./screens/*.tsx');
const screen = (slug: string) => {
  const Screen = lazy(() => screens[`./screens/${slug}.tsx`]!());
  return (preview: PreviewChoice) => (
    <Suspense fallback={<div className="docs-blueprint__pending" aria-hidden="true" />}>
      <Screen {...preview} />
    </Suspense>
  );
};

/** The preview region choices of the screens that expose them. A test keeps these equal to the template exports. */
export const DASHBOARD_WIDGETS = [
  { value: 'kpis', label: 'Key metrics' },
  { value: 'revenue', label: 'Revenue chart' },
  { value: 'channels', label: 'Orders by channel' },
  { value: 'orders', label: 'Recent orders' },
  { value: 'activity', label: 'Activity' },
];
export const OVERVIEW_WIDGETS = [
  { value: 'numbers', label: 'Numbers' },
  { value: 'today', label: 'Today list' },
];
export const REPORTS_WIDGETS = [{ value: 'reports', label: 'Report lists' }];

const DATA_STATES = [
  { value: 'ready', label: 'Ready' },
  { value: 'loading', label: 'Loading' },
  { value: 'empty', label: 'Empty' },
  { value: 'error', label: 'Error' },
];
const ALL = { value: 'all', label: 'All regions' };

export const blueprints: Blueprint[] = [
  {
    slug: 'analytics-dashboard',
    appTheme: true,
    title: 'Analytics dashboard',
    summary: 'KPIs, trend and breakdown charts, a sortable order table and an activity feed, each widget loading independently.',
    profile: 'dashboard',
    patterns: ['dashboard-grid', 'overview'],
    files: ['AnalyticsDashboard.tsx', 'AnalyticsDashboard.data.ts', 'shared.tsx'],
    highlights: [
      'PageHeader with a date-range Select and the single ink action; a StatGroup of four KPIs with the change written out in words instead of tiles or sparklines (quantity marks only on the order count, never on money or rates).',
      'Revenue line chart (this period against the previous one) and a horizontal bar chart. Both carry a text summary and a "View as table" fallback.',
      'DataTable of recent orders: sort, search (also driven by the top bar), status and channel filters, pagination, Tag statuses and an identical overflow menu on every row.',
      'Activity Timeline; Skeleton, empty and error states per widget (use the preview controls), with Retry bringing back only the failed widget.',
      'Light and dark through the theme toggle, comfortable and compact density from the display menu in the top bar.',
    ],
    tryIt: 'Switch the date range, sort or filter the table, then force a region into loading, empty or error with the controls below.',
    preview: { widgets: [ALL, ...DASHBOARD_WIDGETS], states: DATA_STATES },
    render: screen('analytics-dashboard'),
  },
  {
    slug: 'admin-list-detail',
    appTheme: true,
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
    render: screen('admin-list-detail'),
  },
  {
    slug: 'board',
    appTheme: true,
    title: 'Task board',
    summary: 'A sprint board: numbered stages, cards that move by drag, keyboard or menu, WIP limits and a details drawer.',
    profile: 'saas',
    patterns: ['list-detail'],
    files: ['Board.tsx', 'Board.data.ts', 'shared.tsx'],
    highlights: [
      'PageHeader with the single ink action (New task) and a full-width text filter; the filter hides cards, marks matches and the column counts follow.',
      'KanbanBoard with four numbered stages that assemble in order; quantity marks tick when a card moves. Doing warns over its limit of 3, Review refuses drops when full and says so.',
      'Three ways to move a card: pointer drag with a placeholder at the drop index, Space then arrow keys (one polite announcement per step), or "Move to…" in the card menu (Shift+F10).',
      'A card opens a Drawer with its details and focus returns to the card on close; New task reuses a Drawer with a labelled Field.',
      'Loading, empty and error states (preview controls); a move that your API rejects rolls the card back and offers Retry.',
    ],
    tryIt: 'Press Space on a card, move it with the arrow keys and drop it with Space; or open its menu with Shift+F10 and choose Move to…',
    preview: { states: DATA_STATES },
    render: screen('board'),
  },
  {
    slug: 'overview-index',
    appTheme: true,
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
    render: screen('overview-index'),
  },
  {
    slug: 'settings',
    appTheme: true,
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
    render: screen('settings'),
  },
  {
    slug: 'checkout',
    appTheme: false,
    title: 'Checkout',
    summary: 'A guest-first, four-step checkout with hosted card fields, an order summary on every step and a payment result.',
    profile: 'ecommerce',
    patterns: ['checkout'],
    files: ['Checkout.tsx', 'Checkout.data.ts', 'figures.tsx'],
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
    render: screen('checkout'),
  },
  {
    slug: 'sign-in',
    appTheme: false,
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
    render: screen('sign-in'),
  },
  {
    slug: 'article-detail',
    appTheme: true,
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
    render: screen('article-detail'),
  },
];

export const findBlueprint = (slug: string | undefined) => blueprints.find((b) => b.slug === slug);
