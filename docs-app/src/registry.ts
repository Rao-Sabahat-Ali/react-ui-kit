import type { ReactNode } from 'react';
import catalog from './catalog.generated.json';

export interface Example {
  title: string;
  description?: string;
  code: string;
  render: () => ReactNode;
}

export interface CatalogComponent {
  name: string;
  slug: string;
  category: string;
  status: string;
  purpose: string;
  profiles: string[];
}

export interface CatalogProfile {
  name: string;
  description: string;
  defaultTheme: string;
  density: string;
}

const modules = import.meta.glob<{ examples: Example[] }>('../../src/components/*/*.examples.tsx', { eager: true });

/** Examples keyed by component folder name (matches spec `name`). */
export const examplesByName = new Map<string, Example[]>(
  Object.entries(modules).map(([path, mod]) => [path.split('/').at(-2)!, mod.examples]),
);

export const components: CatalogComponent[] = catalog.components;
export const profiles: CatalogProfile[] = catalog.profiles;
export const specVersion: string = catalog.version;

export const isImplemented = (c: CatalogComponent) => examplesByName.has(c.name);

export const CATEGORY_LABELS: Record<string, string> = {
  foundation: 'Foundation',
  button: 'Button',
  form: 'Form',
  data: 'Data',
  panel: 'Panel',
  overlay: 'Overlay',
  menu: 'Menu',
  messages: 'Messages',
  media: 'Media',
  chart: 'Chart',
  file: 'File',
  layout: 'Layout',
  misc: 'Misc',
};
