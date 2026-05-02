import { computeLinkOffsets } from './link';

function makeLink(id: number, aNodeId: number, zNodeId: number) {
  return { id, aNodeId, zNodeId };
}

describe('computeLinkOffsets', () => {
  test('empty list returns empty map', () => {
    expect(computeLinkOffsets([])).toEqual(new Map());
  });

  test('single link has offset 0', () => {
    const offsets = computeLinkOffsets([makeLink(1, 10, 20)]);
    expect(offsets.get(1)).toBe(0);
  });

  test('two parallel links get offsets -0.5 and 0.5', () => {
    const offsets = computeLinkOffsets([makeLink(1, 10, 20), makeLink(2, 10, 20)]);
    expect(offsets.get(1)).toBe(-0.5);
    expect(offsets.get(2)).toBe(0.5);
  });

  test('three parallel links get offsets -1, 0, 1', () => {
    const offsets = computeLinkOffsets([makeLink(1, 10, 20), makeLink(2, 10, 20), makeLink(3, 10, 20)]);
    expect(offsets.get(1)).toBe(-1);
    expect(offsets.get(2)).toBe(0);
    expect(offsets.get(3)).toBe(1);
  });

  test('four parallel links get offsets -1.5, -0.5, 0.5, 1.5', () => {
    const links = [makeLink(1, 10, 20), makeLink(2, 10, 20), makeLink(3, 10, 20), makeLink(4, 10, 20)];
    const offsets = computeLinkOffsets(links);
    expect(offsets.get(1)).toBe(-1.5);
    expect(offsets.get(2)).toBe(-0.5);
    expect(offsets.get(3)).toBe(0.5);
    expect(offsets.get(4)).toBe(1.5);
  });

  test('node pair is identified by unordered node IDs', () => {
    // Link 1: A→Z, Link 2: Z→A — treated as same pair
    const offsets = computeLinkOffsets([makeLink(1, 10, 20), makeLink(2, 20, 10)]);
    expect(offsets.get(1)).toBe(-0.5);
    expect(offsets.get(2)).toBe(0.5);
  });

  test('independent pairs are offset separately', () => {
    const links = [makeLink(1, 10, 20), makeLink(2, 10, 20), makeLink(3, 30, 40)];
    const offsets = computeLinkOffsets(links);
    // pair (10,20): two links → -0.5, 0.5
    expect(offsets.get(1)).toBe(-0.5);
    expect(offsets.get(2)).toBe(0.5);
    // pair (30,40): one link → 0
    expect(offsets.get(3)).toBe(0);
  });

  test('offsets are symmetric around zero for any n', () => {
    for (let n = 1; n <= 6; n++) {
      const links = Array.from({ length: n }, (_, i) => makeLink(i + 1, 10, 20));
      const offsets = computeLinkOffsets(links);
      const values = links.map((l) => offsets.get(l.id)!);
      const sum = values.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(0);
    }
  });
});
