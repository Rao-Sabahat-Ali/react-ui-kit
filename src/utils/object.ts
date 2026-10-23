/** Read a value by dot path ("address.city"). */
export function getByPath(source: unknown, path: string): unknown {
  let node: unknown = source;
  for (const part of path.split('.')) {
    if (node === null || node === undefined) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return node;
}
