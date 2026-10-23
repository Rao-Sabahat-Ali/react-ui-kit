/**
 * Built-in icon set: 24×24 grid, 1.5px stroke, round caps, `currentColor`.
 * Original geometric paths (no third-party icon set).
 */
export interface IconDefinition {
  d: string;
  /** Filled instead of stroked. */
  fill?: boolean;
  /** Mirror horizontally in RTL. */
  directional?: boolean;
}

const circle = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0z`;

export const builtInIcons = {
  check: { d: 'M5 12l5 5L20 7' },
  x: { d: 'M6 6l12 12M18 6L6 18' },
  'chevron-down': { d: 'M6 9l6 6 6-6' },
  'chevron-up': { d: 'M6 15l6-6 6 6' },
  'chevron-left': { d: 'M15 6l-6 6 6 6', directional: true },
  'chevron-right': { d: 'M9 6l6 6-6 6', directional: true },
  'chevrons-left': { d: 'M11 17l-5-5 5-5M18 17l-5-5 5-5', directional: true },
  'chevrons-right': { d: 'M13 17l5-5-5-5M6 17l5-5-5-5', directional: true },
  'arrow-up': { d: 'M12 19V5M5 12l7-7 7 7' },
  'arrow-down': { d: 'M12 5v14M19 12l-7 7-7-7' },
  'arrow-left': { d: 'M19 12H5M12 19l-7-7 7-7', directional: true },
  'arrow-right': { d: 'M5 12h14M12 5l7 7-7 7', directional: true },
  search: { d: `${circle(11, 11, 7)}M20 20l-4-4` },
  plus: { d: 'M12 5v14M5 12h14' },
  minus: { d: 'M5 12h14' },
  info: { d: `${circle(12, 12, 9)}M12 11v5M12 8h.01` },
  'alert-circle': { d: `${circle(12, 12, 9)}M12 7v6M12 16h.01` },
  'check-circle': { d: `${circle(12, 12, 9)}M8 12l3 3 5-6` },
  'alert-triangle': { d: 'M12 3L2 20h20L12 3zM12 10v4M12 17h.01' },
  sun: { d: `${circle(12, 12, 4)}M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4` },
  moon: { d: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z' },
  menu: { d: 'M4 6h16M4 12h16M4 18h16' },
  'more-horizontal': { d: `${circle(5, 12, 1)}${circle(12, 12, 1)}${circle(19, 12, 1)}` },
  'more-vertical': { d: `${circle(12, 5, 1)}${circle(12, 12, 1)}${circle(12, 19, 1)}` },
  filter: { d: 'M4 5h16l-6 7v6l-4 2v-8L4 5z' },
  sort: { d: 'M8 4v16M4 8l4-4 4 4M16 20V4M12 16l4 4 4-4' },
  'sort-up': { d: 'M12 19V5M6 11l6-6 6 6' },
  'sort-down': { d: 'M12 5v14M18 13l-6 6-6-6' },
  calendar: { d: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4' },
  upload: { d: 'M12 16V4M7 9l5-5 5 5M4 20h16' },
  download: { d: 'M12 4v12M7 11l5 5 5-5M4 20h16' },
  trash: { d: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13' },
  edit: { d: 'M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4' },
  eye: { d: `M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z${circle(12, 12, 3)}` },
  'eye-off': { d: 'M3 3l18 18M10.6 6.1A10 10 0 0 1 12 6c6 0 10 6 10 6a17 17 0 0 1-3 3.5M6.6 6.6C3.9 8.3 2 12 2 12s4 7 10 7a9.6 9.6 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2' },
  user: { d: `${circle(12, 8, 4)}M4 21a8 8 0 0 1 16 0` },
  settings: { d: `${circle(12, 12, 3)}M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9L7 7M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1` },
  home: { d: 'M3 11l9-8 9 8M5 9v11h14V9' },
  'external-link': { d: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6', directional: true },
  copy: { d: 'M8 8h12v12H8zM16 8V4H4v12h4' },
  star: { d: 'M12 3l2.8 5.8 6.2.9-4.5 4.4 1.1 6.2L12 17.4l-5.6 2.9 1.1-6.2L3 9.7l6.2-.9L12 3z' },
  'star-filled': { d: 'M12 3l2.8 5.8 6.2.9-4.5 4.4 1.1 6.2L12 17.4l-5.6 2.9 1.1-6.2L3 9.7l6.2-.9L12 3z', fill: true },
  pause: { d: 'M7 5h3v14H7zM14 5h3v14h-3z', fill: true },
  play: { d: 'M8 5v14l11-7z', fill: true },
  rotate: { d: 'M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5' },
  maximize: { d: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5' },
  refresh: { d: 'M20 11a8 8 0 0 0-14.9-3M4 4v4h4M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4' },
} satisfies Record<string, IconDefinition>;

export type BuiltInIconName = keyof typeof builtInIcons;
