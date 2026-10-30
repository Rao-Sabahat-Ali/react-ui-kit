import { describe, expect, it } from 'vitest';
import { components, isImplemented, loadAllExamples, loadExamples } from './registry';

describe('docs registry', () => {
  it('has live examples for every specified component, including the foundation providers', async () => {
    const missing = components.filter((c) => !isImplemented(c)).map((c) => c.name);
    expect(missing).toEqual([]);
    for (const name of ['ThemeProvider', 'LocaleProvider', 'FocusTrap', 'Portal']) {
      expect((await loadExamples(name))?.length, name).toBeGreaterThan(0);
    }
  });

  it('every example has code and a render function', async () => {
    for (const [name, examples] of await loadAllExamples()) {
      for (const example of examples) {
        expect(example.code.length, `${name}: ${example.title}`).toBeGreaterThan(0);
        expect(typeof example.render, `${name}: ${example.title}`).toBe('function');
      }
    }
  });
});
