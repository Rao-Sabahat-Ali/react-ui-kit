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
  dashboard: { screen: 'AnalyticsDashboard', heading: 'Overview', files: ['AnalyticsDashboard.tsx', 'AnalyticsDashboard.data.ts', 'shared.tsx'] },
  admin: { screen: 'AdminListDetail', heading: 'Invoices', files: ['AdminListDetail.tsx', 'AdminListDetail.data.ts', 'shared.tsx'] },
};
