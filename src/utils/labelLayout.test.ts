import { computeLabelDistances, type LabelLayoutEdge } from './labelLayout';

const REST = 40;
const MIN = REST / 2;
const LABEL_SIZE = { w: 60, h: 10 };

function edge(
  overrides: Partial<LabelLayoutEdge> &
    Pick<LabelLayoutEdge, 'id' | 'aNodeId' | 'zNodeId' | 'sourceX' | 'sourceY' | 'targetX' | 'targetY'>,
): LabelLayoutEdge {
  return {
    offsetPx: 0,
    hasAtoz: true,
    hasZtoa: true,
    ...overrides,
  };
}

describe('computeLabelDistances', () => {
  test('no collision: labels 300px apart stay at restDistance', () => {
    const edges = [
      edge({ id: 'A', aNodeId: 1, zNodeId: 2, sourceX: 0, sourceY: 0, targetX: 200, targetY: 0 }),
      edge({ id: 'B', aNodeId: 3, zNodeId: 4, sourceX: 0, sourceY: 300, targetX: 200, targetY: 300 }),
    ];
    const map = computeLabelDistances(edges, LABEL_SIZE, REST, { w: 0, h: 0 }, MIN);
    expect(map.get('A')).toBe(40);
    expect(map.get('B')).toBe(40);
  });

  test('head-on collision: irreducible boundary clash with dimensionless nodes', () => {
    // Edge A: (0,0)→(200,0)   u=(1,0)  tip=(100,0)  ztoa=(170,0) at x=40
    // Edge B: (300,0)→(100,0)  u=(-1,0) tip=(200,0) ztoa=(130,0) at x=40
    // Initial ztoa-ztoa distance = 40 px → constraint fires.
    // maxX = max(20, 100 − 0 − 60) = 40 = restDistance → irreducible boundary clash.
    const edges = [
      edge({ id: 'A', aNodeId: 1, zNodeId: 2, sourceX: 0, sourceY: 0, targetX: 200, targetY: 0 }),
      edge({ id: 'B', aNodeId: 3, zNodeId: 4, sourceX: 300, sourceY: 0, targetX: 100, targetY: 0 }),
    ];
    const map = computeLabelDistances(edges, LABEL_SIZE, REST, { w: 0, h: 0 }, MIN);
    expect(map.get('A')).toBe(40);
    expect(map.get('B')).toBe(40);
  });

  test('parallel edges (different node pairs): repulsion is perpendicular, distances stay at restDistance', () => {
    const edges = [
      edge({ id: 'A', aNodeId: 1, zNodeId: 2, sourceX: 0, sourceY: 0, targetX: 200, targetY: 0 }),
      edge({ id: 'B', aNodeId: 3, zNodeId: 4, sourceX: 0, sourceY: 20, targetX: 200, targetY: 20 }),
    ];
    const map = computeLabelDistances(edges, LABEL_SIZE, REST, { w: 0, h: 0 }, MIN);
    expect(Math.abs((map.get('A') ?? 0) - 40)).toBeLessThan(1);
    expect(Math.abs((map.get('B') ?? 0) - 40)).toBeLessThan(1);
  });

  test('no-label edge: excluded from optimization, maps to restDistance', () => {
    const edges = [
      edge({
        id: 'A',
        aNodeId: 1,
        zNodeId: 2,
        sourceX: 0,
        sourceY: 0,
        targetX: 100,
        targetY: 0,
        hasAtoz: false,
        hasZtoa: false,
      }),
    ];
    const map = computeLabelDistances(edges, LABEL_SIZE, REST, { w: 0, h: 0 }, MIN);
    expect(map.get('A')).toBe(40);
  });

  test('single-label edge: irreducible boundary clash with dimensionless nodes', () => {
    // Edge A: (0,0)→(200,0)   u=(1,0)   tip=(100,0) atoz=(30,0) at x=40
    // Edge B: (210,0)→(10,0)  u=(-1,0)  tip=(110,0) ztoa=(40,0) at x=40
    // Distance atoz_A to ztoa_B = 10 px < mGap → constraint fires.
    // maxX_A = maxX_B = 40 = restDistance (dimensionless nodes) → irreducible boundary clash.
    const edges = [
      edge({
        id: 'A',
        aNodeId: 1,
        zNodeId: 2,
        sourceX: 0,
        sourceY: 0,
        targetX: 200,
        targetY: 0,
        hasAtoz: true,
        hasZtoa: false,
      }),
      edge({
        id: 'B',
        aNodeId: 3,
        zNodeId: 4,
        sourceX: 210,
        sourceY: 0,
        targetX: 10,
        targetY: 0,
        hasAtoz: false,
        hasZtoa: true,
      }),
    ];
    const map = computeLabelDistances(edges, LABEL_SIZE, REST, { w: 0, h: 0 }, MIN);
    expect(map.get('A')).toBe(40);
    expect(map.get('B')).toBe(40);
  });

  test('zero-length edge: skipped by layout, maps to restDistance', () => {
    const edges = [edge({ id: 'A', aNodeId: 1, zNodeId: 2, sourceX: 100, sourceY: 100, targetX: 100, targetY: 100 })];
    const map = computeLabelDistances(edges, LABEL_SIZE, REST, { w: 0, h: 0 }, MIN);
    expect(map.get('A')).toBe(40);
  });

  test('same-node-pair edges: repulsion skipped entirely, both stay at restDistance', () => {
    const edges = [
      edge({ id: 'A', aNodeId: 1, zNodeId: 2, sourceX: 0, sourceY: 0, targetX: 200, targetY: 0, offsetPx: 8 }),
      edge({ id: 'B', aNodeId: 1, zNodeId: 2, sourceX: 0, sourceY: 0, targetX: 200, targetY: 0, offsetPx: -8 }),
    ];
    const map = computeLabelDistances(edges, LABEL_SIZE, REST, { w: 0, h: 0 }, MIN);
    expect(map.get('A')).toBe(40);
    expect(map.get('B')).toBe(40);
  });

  test('mutual midpoint push: converging edges pushed inward below restDistance', () => {
    // Edge A: (0,0)→(340,0)    u=(1,0)   tip=(170,0) atoz=(100,0) at x=40
    // Edge B: (140,0)→(-140,0) u=(-1,0)  tip=(0,0)   atoz=(70,0)  at x=40
    // Distance atoz_A to atoz_B = 30 px < mGap → constraint fires.
    // Both labels move inward (x decreases) into the [minX=20, restDistance=40) range.
    const edges = [
      edge({ id: 'A', aNodeId: 1, zNodeId: 2, sourceX: 0, sourceY: 0, targetX: 340, targetY: 0 }),
      edge({ id: 'B', aNodeId: 3, zNodeId: 4, sourceX: 140, sourceY: 0, targetX: -140, targetY: 0 }),
    ];
    const map = computeLabelDistances(edges, LABEL_SIZE, REST, { w: 0, h: 0 }, MIN);
    expect(map.get('A')).toBeLessThan(40);
    expect(map.get('A')).toBeGreaterThan(20);
    expect(map.get('B')).toBeLessThan(40);
    expect(map.get('B')).toBeGreaterThan(20);
  });

  test('node-boundary clamping: diagonal edge clamped to maxX < restDistance', () => {
    // nodeSize = { w: 120, h: 40 }
    // Edge A: (0,0)→(168,224), len=280, ux=0.6, uy=0.8
    // nodeHalfExtent = |0.6|·60 + |0.8|·20 = 36 + 16 = 52
    // maxX = max(20, 140 − 52 − 60) = max(20, 28) = 28 < restDistance=40
    const edges = [edge({ id: 'A', aNodeId: 1, zNodeId: 2, sourceX: 0, sourceY: 0, targetX: 168, targetY: 224 })];
    const map = computeLabelDistances(edges, LABEL_SIZE, REST, { w: 120, h: 40 }, MIN);
    expect(map.get('A')).toBeLessThan(40);
  });
});
