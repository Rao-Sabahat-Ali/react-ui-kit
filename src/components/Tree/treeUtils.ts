import { useCallback, useState } from 'react';
import type { IconName } from '../Icon/Icon';

export type TreeKey = string | number;

export interface TreeNode<T = unknown> {
  key: TreeKey;
  label: string;
  data?: T;
  icon?: IconName;
  children?: TreeNode<T>[];
  /** Never has children; skips lazy loading. */
  leaf?: boolean;
  disabled?: boolean;
  selectable?: boolean;
}

export type TreeSelectionMode = 'single' | 'multiple' | 'checkbox';
export interface TreeCheckSelection {
  checked: TreeKey[];
  partial: TreeKey[];
}
export type TreeSelectionValue = TreeKey | TreeKey[] | TreeCheckSelection | null;

export type ChildrenOf<T> = (node: TreeNode<T>) => TreeNode<T>[] | undefined;

export interface FlatNode<T> {
  node: TreeNode<T>;
  level: number;
  setSize: number;
  posInSet: number;
  parentKey: TreeKey | null;
}

/** Visible nodes in document order (children of collapsed nodes are skipped). */
export function flattenVisible<T>(
  nodes: TreeNode<T>[],
  isExpanded: (node: TreeNode<T>) => boolean,
  childrenOf: ChildrenOf<T>,
  level = 1,
  parentKey: TreeKey | null = null,
  out: FlatNode<T>[] = [],
): FlatNode<T>[] {
  nodes.forEach((node, index) => {
    out.push({ node, level, setSize: nodes.length, posInSet: index + 1, parentKey });
    const children = childrenOf(node);
    if (children && children.length > 0 && isExpanded(node)) flattenVisible(children, isExpanded, childrenOf, level + 1, node.key, out);
  });
  return out;
}

/** Keep nodes whose label matches, plus their ancestors. `forced` receives keys of ancestors to expand. */
export function filterTree<T>(nodes: TreeNode<T>[], query: string, childrenOf: ChildrenOf<T>, forced: Set<TreeKey> = new Set()): { nodes: TreeNode<T>[]; forced: Set<TreeKey> } {
  const q = query.trim().toLowerCase();
  if (!q) return { nodes, forced };
  const walk = (list: TreeNode<T>[]): TreeNode<T>[] => {
    const result: TreeNode<T>[] = [];
    for (const node of list) {
      const kids = childrenOf(node);
      const keptKids = kids ? walk(kids) : [];
      const matches = node.label.toLowerCase().includes(q);
      if (matches || keptKids.length > 0) {
        if (keptKids.length > 0) forced.add(node.key);
        result.push({ ...node, children: kids ? keptKids : undefined });
      }
    }
    return result;
  };
  return { nodes: walk(nodes), forced };
}

export function findNode<T>(nodes: TreeNode<T>[], key: TreeKey, childrenOf: ChildrenOf<T>): TreeNode<T> | undefined {
  for (const node of nodes) {
    if (node.key === key) return node;
    const kids = childrenOf(node);
    const found = kids && findNode(kids, key, childrenOf);
    if (found) return found;
  }
  return undefined;
}

export function descendantKeys<T>(node: TreeNode<T>, childrenOf: ChildrenOf<T>): TreeKey[] {
  const out: TreeKey[] = [];
  for (const child of childrenOf(node) ?? []) out.push(child.key, ...descendantKeys(child, childrenOf));
  return out;
}

/** Keys of the ancestors of `key` (outermost first). */
export function ancestorKeys<T>(nodes: TreeNode<T>[], key: TreeKey, childrenOf: ChildrenOf<T>, trail: TreeKey[] = []): TreeKey[] | null {
  for (const node of nodes) {
    if (node.key === key) return trail;
    const found = ancestorKeys(childrenOf(node) ?? [], key, childrenOf, [...trail, node.key]);
    if (found) return found;
  }
  return null;
}

const participates = <T,>(node: TreeNode<T>) => !node.disabled && node.selectable !== false;

/** Derive checked / partial state: a parent is checked when all participating children are, partial when some are. */
export function resolveChecks<T>(roots: TreeNode<T>[], checkedKeys: Iterable<TreeKey>, childrenOf: ChildrenOf<T>): { checked: Set<TreeKey>; partial: Set<TreeKey> } {
  const checked = new Set<TreeKey>(checkedKeys);
  const partial = new Set<TreeKey>();
  const visit = (node: TreeNode<T>): 'checked' | 'partial' | 'none' => {
    const kids = childrenOf(node) ?? [];
    const states = kids.map((kid) => ({ kid, state: visit(kid) }));
    const counted = states.filter((s) => participates(s.kid));
    if (counted.length === 0) return checked.has(node.key) ? 'checked' : 'none';
    if (counted.every((s) => s.state === 'checked')) {
      checked.add(node.key);
      return 'checked';
    }
    checked.delete(node.key);
    if (counted.some((s) => s.state !== 'none')) {
      partial.add(node.key);
      return 'partial';
    }
    return 'none';
  };
  roots.forEach(visit);
  return { checked, partial };
}

export function selectionToSet(selection: TreeSelectionValue | undefined): Set<TreeKey> {
  if (selection === null || selection === undefined) return new Set();
  if (Array.isArray(selection)) return new Set(selection);
  if (typeof selection === 'object') return new Set(selection.checked);
  return new Set([selection]);
}

/** Resolved checkbox state for a selection value. */
export function checkState<T>(roots: TreeNode<T>[], selection: TreeSelectionValue | undefined, childrenOf: ChildrenOf<T>) {
  return resolveChecks(roots, selectionToSet(selection), childrenOf);
}

/** Next selection value after the user activates `node`. */
export function nextSelection<T>(mode: TreeSelectionMode, selection: TreeSelectionValue | undefined, node: TreeNode<T>, roots: TreeNode<T>[], childrenOf: ChildrenOf<T>): TreeSelectionValue {
  if (mode === 'single') return selection === node.key ? null : node.key;
  if (mode === 'multiple') {
    const set = selectionToSet(selection);
    if (set.has(node.key)) set.delete(node.key);
    else set.add(node.key);
    return [...set];
  }
  const { checked } = checkState(roots, selection, childrenOf);
  const on = !checked.has(node.key);
  const targets = [node.key, ...descendantKeysWhere(node, childrenOf, participates)];
  for (const key of targets) {
    if (on) checked.add(key);
    else checked.delete(key);
  }
  const resolved = resolveChecks(roots, checked, childrenOf);
  return { checked: [...resolved.checked], partial: [...resolved.partial] };
}

function descendantKeysWhere<T>(node: TreeNode<T>, childrenOf: ChildrenOf<T>, test: (n: TreeNode<T>) => boolean): TreeKey[] {
  const out: TreeKey[] = [];
  for (const child of childrenOf(node) ?? []) {
    if (!test(child)) continue;
    out.push(child.key, ...descendantKeysWhere(child, childrenOf, test));
  }
  return out;
}

export const isRtl = (el: Element | null): boolean => Boolean(el && (getComputedStyle(el).direction === 'rtl' || el.closest('[dir="rtl"]')));

/** Lazy children cache + loading state shared by Tree, TreeTable and OrganizationChart. */
export function useLazyChildren<T>(onLoadChildren?: (node: TreeNode<T>) => Promise<TreeNode<T>[]>) {
  const [loaded, setLoaded] = useState<Map<TreeKey, TreeNode<T>[]>>(() => new Map());
  const [loading, setLoading] = useState<Set<TreeKey>>(() => new Set());

  const childrenOf = useCallback<ChildrenOf<T>>((node) => node.children ?? loaded.get(node.key), [loaded]);
  const needsLoad = useCallback((node: TreeNode<T>) => Boolean(onLoadChildren) && !node.leaf && node.children === undefined && !loaded.has(node.key), [onLoadChildren, loaded]);
  const isExpandable = useCallback((node: TreeNode<T>) => (childrenOf(node)?.length ?? 0) > 0 || needsLoad(node), [childrenOf, needsLoad]);

  const load = useCallback(
    async (node: TreeNode<T>) => {
      if (!onLoadChildren) return;
      setLoading((prev) => new Set(prev).add(node.key));
      try {
        const children = await onLoadChildren(node);
        setLoaded((prev) => new Map(prev).set(node.key, children));
      } finally {
        setLoading((prev) => {
          const next = new Set(prev);
          next.delete(node.key);
          return next;
        });
      }
    },
    [onLoadChildren],
  );

  return { childrenOf, needsLoad, isExpandable, load, loading };
}

/** Immutable removal; returns the new roots and the removed node. */
export function removeNode<T>(nodes: TreeNode<T>[], key: TreeKey): { nodes: TreeNode<T>[]; removed?: TreeNode<T> } {
  let removed: TreeNode<T> | undefined;
  const walk = (list: TreeNode<T>[]): TreeNode<T>[] => {
    const result: TreeNode<T>[] = [];
    for (const node of list) {
      if (node.key === key) {
        removed = node;
        continue;
      }
      result.push(node.children ? { ...node, children: walk(node.children) } : node);
    }
    return result;
  };
  return { nodes: walk(nodes), removed };
}

export type DropPosition = 'before' | 'after' | 'inside';

export function insertNode<T>(nodes: TreeNode<T>[], targetKey: TreeKey, position: DropPosition, inserted: TreeNode<T>): TreeNode<T>[] {
  const walk = (list: TreeNode<T>[]): TreeNode<T>[] => {
    const result: TreeNode<T>[] = [];
    for (const node of list) {
      if (node.key === targetKey) {
        if (position === 'before') result.push(inserted, node);
        else if (position === 'after') result.push(node, inserted);
        else result.push({ ...node, children: [...(node.children ?? []), inserted] });
      } else {
        result.push(node.children ? { ...node, children: walk(node.children) } : node);
      }
    }
    return result;
  };
  return walk(nodes);
}
