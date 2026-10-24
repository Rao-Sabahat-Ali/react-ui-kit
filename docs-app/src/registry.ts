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

// Components live in src/components/<Name>/, the foundation providers in src/theme and src/locale.
const modules = import.meta.glob<{ examples: Example[] }>(['../../src/components/*/*.examples.tsx', '../../src/theme/*.examples.tsx', '../../src/locale/*.examples.tsx'], { eager: true });

/** Examples keyed by the name in the file (`<Name>.examples.tsx`), which matches the spec `name`. */
export const examplesByName = new Map<string, Example[]>(
  Object.entries(modules).map(([path, mod]) => [path.split('/').at(-1)!.replace(/\.examples\.tsx$/, ''), mod.examples]),
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
