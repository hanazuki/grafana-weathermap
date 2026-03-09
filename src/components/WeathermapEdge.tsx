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
  labelBgColor: string;
  [key: string]: unknown;
}

const STROKE_WIDTH = 4
const TIP_LEN = 8;   // length of the sharpened tip
const LABEL_DIST = 40;   // px from midpoint along segment

function drawPencilTip(
  ax: number, ay: number, // base of the half-arrow (source or target)
  bx: number, by: number, // tip (midpoint)
  color: string
): React.ReactElement {
  const len = Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2);
  if (len < 1) {
    return <></>;
  }
  // Unit forward vector
  const dx = (bx - ax) / len;
  const dy = (by - ay) / len;
  // Perpendicular
  const px = dy;
  const py = -dx;

  const hw = STROKE_WIDTH / 2; // half-width at the base of the tip, matching stroke width
  const baseX = bx - dx * TIP_LEN;
  const baseY = by - dy * TIP_LEN;

  const lx = baseX + px * hw;
  const ly = baseY + py * hw;
  const rx = baseX - px * hw;
  const ry = baseY - py * hw;

  return <polygon points={`${lx},${ly} ${bx},${by} ${rx},${ry}`} fill={color} />;
}

export const WeathermapEdge: React.FC<EdgeProps> = ({ sourceX, sourceY, targetX, targetY, data }) => {
  const { outColor = GRAY_COLOR, inColor = GRAY_COLOR, outSpeed = null, inSpeed = null, offsetPx = 0, labelBgColor = 'transparent' } =
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

  // Label rotation: follow arrow angle, flip if pointing leftward to keep text readable
  const angleDeg = Math.atan2(ny, nx) * (180 / Math.PI);
  const labelAngle = Math.abs(angleDeg) > 90 ? angleDeg + 180 : angleDeg;

  return (
    <g>
      {/* Source half-arrow: source → midpoint (out-traffic) */}
      <path d={`M ${sx} ${sy} L ${mx - nx * TIP_LEN} ${my - ny * TIP_LEN}`} stroke={outColor} strokeWidth={STROKE_WIDTH} fill="none" strokeLinecap="butt" />
      {drawPencilTip(sx, sy, mx, my, outColor)}

      {/* Target half-arrow: target → midpoint (in-traffic) */}
      <path d={`M ${tx} ${ty} L ${mx + nx * TIP_LEN} ${my + ny * TIP_LEN}`} stroke={inColor} strokeWidth={STROKE_WIDTH} fill="none" strokeLinecap="butt" />
      {drawPencilTip(tx, ty, mx, my, inColor)}

      {/* Speed labels (omitted when no data) */}
      {outSpeed && (
        <g transform={`rotate(${labelAngle}, ${outLabelX}, ${outLabelY})`}>
          <rect x={outLabelX - 25} y={outLabelY - 7} width={50} height={14} rx={2} fill={labelBgColor} />
          <text x={outLabelX} y={outLabelY} textAnchor="middle" dominantBaseline="middle" fontSize={10} fill={outColor}>
            {outSpeed}
          </text>
        </g>
      )}
      {inSpeed && (
        <g transform={`rotate(${labelAngle}, ${inLabelX}, ${inLabelY})`}>
          <rect x={inLabelX - 25} y={inLabelY - 7} width={50} height={14} rx={2} fill={labelBgColor} />
          <text x={inLabelX} y={inLabelY} textAnchor="middle" dominantBaseline="middle" fontSize={10} fill={inColor}>
            {inSpeed}
          </text>
        </g>
      )}
    </g>
  );
};
