import { resolve } from 'node:path';
import { compile } from 'sass';
import { scssOptions } from '../vite.config';

/** Compile a stylesheet (path relative to the repo root) to CSS text, for tests of rules jsdom cannot evaluate (media queries). */
export function compileScss(path: string): string {
  return compile(resolve(import.meta.dirname, '..', path), { loadPaths: scssOptions.loadPaths, quietDeps: true, silenceDeprecations: scssOptions.silenceDeprecations }).css;
}

/** The body of the first `@media <query>` block, or ''. */
export function mediaBlock(css: string, query: string): string {
  const start = css.indexOf(`@media ${query}`);
  if (start === -1) return '';
  const open = css.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}' && --depth === 0) return css.slice(open + 1, i);
  }
  return '';
}
