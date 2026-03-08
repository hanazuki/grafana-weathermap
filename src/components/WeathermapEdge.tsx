import React from 'react';
import { EdgeProps } from '@xyflow/react';
import { GRAY_COLOR } from '../utils/color';

export interface WeathermapEdgeData {
  outColor: string;
  inColor: string;
  outSpeed: string | null;
  inSpeed: string | null;
  /** Perpendicular offset in pixels (positive = right of source→target vector). */
  offsetPx: number;
  hasInvalidRefId: boolean;
  [key: string]: unknown;
}

const ARROW_LEN = 8;
const ARROW_WIDTH = 5;
const LABEL_DIST = 20; // px from midpoint along segment

function drawArrowhead(ax: number, ay: number, bx: number, by: number, color: string): React.ReactElement {
  const len = Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2);
  if (len < 1) {
    return <></>;
  }
  const dx = (bx - ax) / len;
  const dy = (by - ay) / len;

  const baseX = bx - dx * ARROW_LEN;
  const baseY = by - dy * ARROW_LEN;
  const lx = baseX + dy * (ARROW_WIDTH / 2);
  const ly = baseY - dx * (ARROW_WIDTH / 2);
  const rx = baseX - dy * (ARROW_WIDTH / 2);
  const ry = baseY + dx * (ARROW_WIDTH / 2);

  return <polygon points={`${bx},${by} ${lx},${ly} ${rx},${ry}`} fill={color} />;
}

export const WeathermapEdge: React.FC<EdgeProps> = ({ sourceX, sourceY, targetX, targetY, data }) => {
  const { outColor = GRAY_COLOR, inColor = GRAY_COLOR, outSpeed = null, inSpeed = null, offsetPx = 0 } =
    (data as WeathermapEdgeData) ?? {};

  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const len = Math.sqrt(dx * dx + dy * dy);

  if (len < 1) {
    return null;
  }

  // Unit perpendicular (right of source→target)
  const px = dy / len;
  const py = -dx / len;

  const ox = px * offsetPx;
  const oy = py * offsetPx;

  const sx = sourceX + ox;
  const sy = sourceY + oy;
  const tx = targetX + ox;
  const ty = targetY + oy;

  const mx = (sx + tx) / 2;
  const my = (sy + ty) / 2;

  // Unit vector source→target (for label positioning)
  const nx = dx / len;
  const ny = dy / len;

  // Speed label positions: just inside midpoint along each segment
  const outLabelX = mx - nx * LABEL_DIST;
  const outLabelY = my - ny * LABEL_DIST;
  const inLabelX = mx + nx * LABEL_DIST;
  const inLabelY = my + ny * LABEL_DIST;

  return (
    <g>
      {/* Source half-arrow: source → midpoint (out-traffic) */}
      <path d={`M ${sx} ${sy} L ${mx} ${my}`} stroke={outColor} strokeWidth={2} fill="none" />
      {drawArrowhead(sx, sy, mx, my, outColor)}

      {/* Target half-arrow: target → midpoint (in-traffic) */}
      <path d={`M ${tx} ${ty} L ${mx} ${my}`} stroke={inColor} strokeWidth={2} fill="none" />
      {drawArrowhead(tx, ty, mx, my, inColor)}

      {/* Speed labels (omitted when no data) */}
      {outSpeed && (
        <text x={outLabelX} y={outLabelY} textAnchor="middle" dominantBaseline="middle" fontSize={10} fill={outColor}>
          {outSpeed}
        </text>
      )}
      {inSpeed && (
        <text x={inLabelX} y={inLabelY} textAnchor="middle" dominantBaseline="middle" fontSize={10} fill={inColor}>
          {inSpeed}
        </text>
      )}
    </g>
  );
};
