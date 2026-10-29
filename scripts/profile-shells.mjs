// Shell defaults per app profile (mirrors design-system-mcp specs/profiles/*.md).
export const PROFILES_SHELL = {
  saas: { variant: 'sidebar', defaultTheme: 'system', bottomNav: true },
  admin: { variant: 'sidebar', defaultTheme: 'system', bottomNav: false },
  dashboard: { variant: 'sidebar', defaultTheme: 'system', bottomNav: false },
  cms: { variant: 'sidebar', defaultTheme: 'light', bottomNav: false },
  pos: { variant: 'full-bleed', defaultTheme: 'light', bottomNav: true },
  game: { variant: 'full-bleed', defaultTheme: 'dark', bottomNav: true },
  ecommerce: { variant: 'top-nav', defaultTheme: 'light', bottomNav: true },
  landing: { variant: 'top-nav', defaultTheme: 'light', bottomNav: false },
};

// Profiles whose starter home screen is a blueprint (files live in templates/blueprints and are shown in the docs "Blueprints" pages).
export const BLUEPRINT_HOMES = {
  dashboard: { screen: 'AnalyticsDashboard', heading: 'Overview', files: ['AnalyticsDashboard.tsx', 'AnalyticsDashboard.data.ts', 'shared.tsx'], include: ['col-12', 'col-xl-4', 'col-xl-8', 'd-md-block', 'd-none', 'gx-3', 'gx-lg-5', 'mb-0', 'mt-2', 'row', 'text-body-secondary', 'text-nowrap'] },
  admin: { screen: 'AdminListDetail', heading: 'Invoices', files: ['AdminListDetail.tsx', 'AdminListDetail.data.ts', 'shared.tsx'], include: ['align-items-center', 'col', 'col-sm-4', 'col-sm-8', 'd-flex', 'd-md-block', 'd-none', 'flex-wrap', 'fw-normal', 'fw-semibold', 'gap-2', 'gx-0', 'mb-0', 'mb-3', 'mb-4', 'me-auto', 'pe-3', 'ps-3', 'row', 'table', 'table-responsive', 'table-sm', 'text-body-secondary', 'text-end', 'text-nowrap'] },
};

// Blueprints a new app can start from with `--blueprint <slug>` (any profile; the same files the docs "Blueprints" pages render).
export const BLUEPRINTS = {
  board: { screen: 'Board', heading: 'Sprint 42', files: ['Board.tsx', 'Board.data.ts', 'shared.tsx'], include: ['align-items-center', 'col-sm-4', 'col-sm-8', 'd-flex', 'flex-wrap', 'fw-normal', 'gap-2', 'gx-0', 'mb-0', 'mb-3', 'pe-3', 'row', 'text-body-secondary'] },
};

// Bootstrap classes written directly in the generated app's source (the style plugin cannot see them; kit-rendered classes are covered by
// the manifest). test/create-app.test.ts checks these lists against the classes the generated sources actually use.
export const STARTER_INCLUDE = ['col-md-6', 'g-3', 'row'];
