/**
 * Blueprint slugs and titles for the docs navigation. Kept apart from `registry.tsx` (which imports every blueprint screen
 * and its source) so the first paint does not download them; a test keeps both lists in step.
 */
export const blueprintNav: { slug: string; title: string }[] = [
  { slug: 'analytics-dashboard', title: 'Analytics dashboard' },
  { slug: 'admin-list-detail', title: 'Admin list to detail' },
  { slug: 'board', title: 'Task board' },
  { slug: 'overview-index', title: 'Overview and index page' },
  { slug: 'settings', title: 'Settings page' },
  { slug: 'checkout', title: 'Checkout' },
  { slug: 'sign-in', title: 'Sign in and reset' },
  { slug: 'article-detail', title: 'Article and detail page' },
];
