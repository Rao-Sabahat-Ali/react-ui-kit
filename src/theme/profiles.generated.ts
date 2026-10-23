// GENERATED from design-system-mcp/specs/tokens/tokens.json v0.1.0. Do not edit.
export const PROFILES = {
  saas: { defaultTheme: 'system', density: 'comfortable' },
  admin: { defaultTheme: 'system', density: 'compact' },
  dashboard: { defaultTheme: 'system', density: 'comfortable' },
  cms: { defaultTheme: 'light', density: 'comfortable' },
  pos: { defaultTheme: 'light', density: 'spacious' },
  game: { defaultTheme: 'dark', density: 'comfortable' },
  ecommerce: { defaultTheme: 'light', density: 'comfortable' },
  landing: { defaultTheme: 'light', density: 'spacious' },
} as const;

export type Profile = keyof typeof PROFILES;
export type ThemeSetting = 'light' | 'dark' | 'system';
export type Density = 'compact' | 'comfortable' | 'spacious';
