import type { GrafanaTheme2 } from '@grafana/data';

export interface LabelLayoutEdge {
  id: string;
  aNodeId: number;
  zNodeId: number;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  offsetPx: number;
  hasAtoz: boolean;
  hasZtoa: boolean;
}

export function estimateLabelSize(fontSize: number, theme: GrafanaTheme2): { w: number; h: number } {
  const ctx = new OffscreenCanvas(0, 0).getContext('2d');
  if (!ctx) {
    return { w: 0, h: 0 };
  }
  ctx.font = `${fontSize}px ${theme.typography.fontFamily}`;
  const textWidth = ctx.measureText('00.0\u202fM').width;
  return { w: textWidth + 4, h: fontSize };
}

const MAX_ITER = 200;

// Resolves per-edge label distances using iterative constraint satisfaction (position-based
// dynamics). Each edge has one degree of freedom x_i (labelDistance): the A→Z and Z→A labels
// sit symmetrically at distance x_i from the edge midpoint along the edge axis. Colliding
// label pairs are pushed apart by splitting the penetration depth equally between the two
// edges, clamped to [minDistance, maxX_i]. If one edge is at its boundary the full correction
// transfers to the other; if both are at their boundaries the overlap is left unresolved.
// Parallel links between the same node pair are excluded from each other's constraints.
export function computeLabelDistances(
  edges: LabelLayoutEdge[],
  labelSize: { w: number; h: number },
  restDistance: number,
  nodeSize: { w: number; h: number },
  minDistance: number,
): Map<string, number> {
  // mGap: center-to-center distance at which two labels are considered touching.
  // hypot(w, h) upper-bounds the OBB touching distance at any relative angle, plus 4 px margin.
  const mGap = Math.hypot(labelSize.w, labelSize.h) + 4;
  const minX = minDistance;

  type ActiveEdge = {
    edgeIndex: number;
    ux: number;
    uy: number;
    tipX: number;
    tipY: number;
    canonPair: string;
    hasAtoz: boolean;
    hasZtoa: boolean;
    maxX: number;
  };

  // Build the active set: edges that have at least one label and nonzero length.
  // Compute geometry (unit vector, tip position, bounds) once per edge.
  const active: ActiveEdge[] = [];
  const activeIndexByEdgeIndex: (number | null)[] = new Array(edges.length).fill(null);

  for (let i = 0; i < edges.length; i++) {
    const e = edges[i];
    if (!e.hasAtoz && !e.hasZtoa) {
      continue;
    }
    const dx = e.targetX - e.sourceX;
    const dy = e.targetY - e.sourceY;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) {
      continue;
    }
    const ux = dx / len;
    const uy = dy / len;
    // Tip: edge midpoint offset perpendicularly by offsetPx (for parallel-link separation).
    const tipX = (e.sourceX + e.targetX) / 2 + (dy / len) * e.offsetPx;
    const tipY = (e.sourceY + e.targetY) / 2 + (-dx / len) * e.offsetPx;
    const lo = Math.min(e.aNodeId, e.zNodeId);
    const hi = Math.max(e.aNodeId, e.zNodeId);
    // maxX: keep the label's far edge flush with the node rectangle face.
    const nodeHalfExtent = (Math.abs(ux) * nodeSize.w) / 2 + (Math.abs(uy) * nodeSize.h) / 2;
    const maxX = Math.max(minX, len / 2 - nodeHalfExtent - labelSize.w);
    activeIndexByEdgeIndex[i] = active.length;
    active.push({
      edgeIndex: i,
      ux,
      uy,
      tipX,
      tipY,
      canonPair: `${lo},${hi}`,
      hasAtoz: e.hasAtoz,
      hasZtoa: e.hasZtoa,
      maxX,
    });
  }

  // x[i]: current labelDistance for active edge i. Start at restDistance.
  const x = new Float64Array(active.length).fill(restDistance);

  // s = -1 for atoz labels (center moves in -u direction as x increases)
  // s = +1 for ztoa labels (center moves in +u direction as x increases)
  const labelCenter = (ae: ActiveEdge, xi: number, s: number): [number, number] => {
    const hw = xi + labelSize.w / 2;
    return [ae.tipX + s * hw * ae.ux, ae.tipY + s * hw * ae.uy];
  };

  for (let iter = 0; iter < MAX_ITER; iter++) {
    const deltaX = new Float64Array(active.length);
    let anyOverlap = false;

    for (let ai = 0; ai < active.length - 1; ai++) {
      const ae = active[ai];

      for (let aj = ai + 1; aj < active.length; aj++) {
        const be = active[aj];
        // Skip parallel links between the same node pair.
        if (be.canonPair === ae.canonPair) {
          continue;
        }

        const labelsAi: [number, number, number][] = []; // [s, cx, cy]
        if (ae.hasAtoz) {
          const [cx, cy] = labelCenter(ae, x[ai], -1);
          labelsAi.push([-1, cx, cy]);
        }
        if (ae.hasZtoa) {
          const [cx, cy] = labelCenter(ae, x[ai], +1);
          labelsAi.push([+1, cx, cy]);
        }

        const labelsAj: [number, number, number][] = [];
        if (be.hasAtoz) {
          const [cx, cy] = labelCenter(be, x[aj], -1);
          labelsAj.push([-1, cx, cy]);
        }
        if (be.hasZtoa) {
          const [cx, cy] = labelCenter(be, x[aj], +1);
          labelsAj.push([+1, cx, cy]);
        }

        for (const [sa, ax, ay] of labelsAi) {
          for (const [sb, bx, by] of labelsAj) {
            const ddx = ax - bx;
            const ddy = ay - by;
            const d = Math.sqrt(ddx * ddx + ddy * ddy);
            if (d >= mGap) {
              continue;
            }
            anyOverlap = true;
            if (d === 0) {
              continue;
            }

            const pen = mGap - d;
            const nx = ddx / d; // unit separation vector
            const ny = ddy / d;

            // Project desired displacement ±(pen/2)·n onto each edge's DOF axis.
            // ∂center_atoz/∂x = −u, ∂center_ztoa/∂x = +u, hence the s factors.
            const dxAiHalf = (pen / 2) * sa * (nx * ae.ux + ny * ae.uy);
            const dxAjHalf = -(pen / 2) * sb * (nx * be.ux + ny * be.uy);

            // Clamp check uses current-iteration x (before accumulated deltaX).
            const aiClamped = x[ai] + dxAiHalf < minX || x[ai] + dxAiHalf > ae.maxX;
            const ajClamped = x[aj] + dxAjHalf < minX || x[aj] + dxAjHalf > be.maxX;

            // If one edge is boundary-clamped, transfer the full correction to the other.
            if (!aiClamped && !ajClamped) {
              deltaX[ai] += dxAiHalf;
              deltaX[aj] += dxAjHalf;
            } else if (aiClamped && !ajClamped) {
              deltaX[aj] += 2 * dxAjHalf;
            } else if (!aiClamped && ajClamped) {
              deltaX[ai] += 2 * dxAiHalf;
            }
            // if both clamped: geometry is irreducible, no correction
          }
        }
      }
    }

    for (let ai = 0; ai < active.length; ai++) {
      x[ai] = Math.max(minX, Math.min(active[ai].maxX, x[ai] + deltaX[ai]));
    }

    if (!anyOverlap) {
      break;
    }
  }

  const result = new Map<string, number>();
  for (let i = 0; i < edges.length; i++) {
    const ai = activeIndexByEdgeIndex[i];
    result.set(edges[i].id, ai !== null ? x[ai] : restDistance);
  }
  return result;
}
