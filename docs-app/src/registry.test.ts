import { describe, expect, it } from 'vitest';
import { components, examplesByName, isImplemented } from './registry';

describe('docs registry', () => {
  it('has live examples for every specified component, including the foundation providers', () => {
    const missing = components.filter((c) => !isImplemented(c)).map((c) => c.name);
    expect(missing).toEqual([]);
    for (const name of ['ThemeProvider', 'LocaleProvider', 'FocusTrap', 'Portal']) {
      expect(examplesByName.get(name)?.length, name).toBeGreaterThan(0);
    }
  });

  it('every example has code and a render function', () => {
    for (const [name, examples] of examplesByName) {
      for (const example of examples) {
        expect(example.code.length, `${name}: ${example.title}`).toBeGreaterThan(0);
        expect(typeof example.render, `${name}: ${example.title}`).toBe('function');
      }
    }
  });
});
