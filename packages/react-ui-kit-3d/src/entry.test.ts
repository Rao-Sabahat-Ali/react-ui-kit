import { describe, expect, it, vi } from 'vitest';
import { probe } from './test/fakes';

vi.mock('three', async () => {
  const actual = await vi.importActual<typeof import('three')>('three');
  const { FakeRenderer, probe: p } = await import('./test/fakes');
  p.threeLoads++;
  return { ...actual, WebGLRenderer: FakeRenderer };
});

describe('package entry', () => {
  it('Scene3D AC-1: importing the package entry does not import three', async () => {
    const entry = await import('./index');
    expect(Object.keys(entry).sort()).toEqual(expect.arrayContaining(['Model3D', 'Scene3D', 'en3d']));
    expect(probe.threeLoads).toBe(0);
  });
});
