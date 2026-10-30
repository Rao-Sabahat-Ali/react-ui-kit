import { useEffect, useState, type ReactNode } from 'react';
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

// Components live in src/components/<Name>/, the foundation providers in src/theme and src/locale, optional packages in packages/*/src/components/<Name>/.
// Loaded on demand: the first paint only needs the catalogue list, not the 140 example files.
const loaders = import.meta.glob<{ examples: Example[] }>(['../../src/components/*/*.examples.tsx', '../../src/theme/*.examples.tsx', '../../src/locale/*.examples.tsx', '../../packages/*/src/components/*/*.examples.tsx']);

/** Example loaders keyed by the name in the file (`<Name>.examples.tsx`), which matches the spec `name`. */
const loaderByName = new Map(Object.entries(loaders).map(([path, load]) => [path.split('/').at(-1)!.replace(/\.examples\.tsx$/, ''), load]));

/** Loads the examples of one component (undefined when it has none yet). */
export const loadExamples = async (name: string): Promise<Example[] | undefined> => (await loaderByName.get(name)?.())?.examples;

/** Loads every example file (tests and tooling; the docs app itself loads one component at a time). */
export async function loadAllExamples(): Promise<Map<string, Example[]>> {
  const entries = await Promise.all([...loaderByName].map(async ([name, load]) => [name, (await load()).examples] as const));
  return new Map(entries);
}

/** Examples of one component, or undefined while they load (and when the component has none). */
export function useExamples(name: string | undefined): Example[] | undefined {
  const [loaded, setLoaded] = useState<{ name: string; examples: Example[] | undefined }>();
  useEffect(() => {
    if (!name) return;
    let live = true;
    void loadExamples(name).then((examples) => live && setLoaded({ name, examples }));
    return () => {
      live = false;
    };
  }, [name]);
  return loaded && loaded.name === name ? loaded.examples : undefined;
}

export const components: CatalogComponent[] = catalog.components;
export const profiles: CatalogProfile[] = catalog.profiles;
export const specVersion: string = catalog.version;

export const isImplemented = (c: CatalogComponent) => loaderByName.has(c.name);

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
