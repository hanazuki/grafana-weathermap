type LinkLike = { id: number; aNodeId: number; zNodeId: number };

/**
 * Computes perpendicular offsets for parallel links between the same node pair.
 *
 * For n links between a pair, offsets are evenly spaced and centered on zero:
 * - odd n=2N+1: -N, -N+1, ..., 0, ..., N
 * - even n=2N:  -N+0.5, ..., -0.5, 0.5, ..., N-0.5
 *
 * Multiply the returned value by a pixel step size to get the actual pixel offset.
 */
export function computeLinkOffsets(links: LinkLike[]): Map<number, number> {
  const pairLinks = new Map<string, number[]>();
  for (const link of links) {
    const a = Math.min(link.aNodeId, link.zNodeId);
    const b = Math.max(link.aNodeId, link.zNodeId);
    const key = `${a}\0${b}`;
    const ids = pairLinks.get(key) ?? [];
    ids.push(link.id);
    pairLinks.set(key, ids);
  }

  const offsets = new Map<number, number>();
  for (const ids of pairLinks.values()) {
    const n = ids.length;
    for (let i = 0; i < n; i++) {
      offsets.set(ids[i], i - (n - 1) / 2);
    }
  }
  return offsets;
}
