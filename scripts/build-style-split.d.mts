export interface StyleSplitManifest {
  schema: number;
  package: string;
  version: string;
  base: string;
  order: string[];
  bootstrap: Record<string, { css: string; needs: string[]; classes: string[] }>;
  utilities: Record<string, { files: string[]; classes: string[] }>;
  components: Record<string, { css: string | null; bootstrap: string[]; utilities: string[]; needs: string[] }>;
  exports: Record<string, string>;
  sizes: Record<string, { bytes: number; gzip: number }>;
  foundation: Record<string, { bootstrap: string[]; utilities: string[] }>;
}
export function splitTopLevel(css: string): string[];
export function normalizeClass(cls: string): string;
export function bootstrapOrder(root?: string): string[];
export function definedClasses(css: string, options?: { owned?: boolean }): Set<string>;
export function collectClassTokens(text: string, fileName?: string): { exact: Set<string>; patterns: { prefix: string; suffix: string }[]; prefixes: Set<string> };
export function importedComponents(text: string, fileName: string, components: string[]): Set<string>;
export function buildStyleSplit(options?: { root?: string; minify?: boolean }): { files: Map<string, string>; manifest: StyleSplitManifest };
export function writeStyleSplit(options?: { root?: string; outDir?: string; minify?: boolean }): { manifest: StyleSplitManifest; outDir: string };
