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
  strokeWidth: number;
  tipLength: number;
  labelDistance: number;
  labelFontSize: number;
  [key: string]: unknown;
}

function drawPencilTip(
  ax: number, ay: number, // base of the half-arrow (source or target)
  bx: number, by: number, // tip (midpoint)
  color: string,
  strokeWidth: number,
  tipLength: number,
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

  const hw = strokeWidth / 2; // half-width at the base of the tip, matching stroke width
  const baseX = bx - dx * tipLength;
  const baseY = by - dy * tipLength;

  const lx = baseX + px * hw;
  const ly = baseY + py * hw;
  const rx = baseX - px * hw;
  const ry = baseY - py * hw;

  return <polygon points={`${lx},${ly} ${bx},${by} ${rx},${ry}`} fill={color} />;
}

export const WeathermapEdge: React.FC<EdgeProps> = ({ id, sourceX, sourceY, targetX, targetY, data }) => {
  const {
    outColor = GRAY_COLOR,
    inColor = GRAY_COLOR,
    outSpeed = null,
    inSpeed = null,
    offsetPx = 0,
    labelBgColor = 'transparent',
    strokeWidth = 4,
    tipLength = 8,
    labelDistance = 40,
    labelFontSize = 10,
  } = (data as WeathermapEdgeData) ?? {};

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
  const outLabelX = mx - nx * labelDistance;
  const outLabelY = my - ny * labelDistance;
  const inLabelX = mx + nx * labelDistance;
  const inLabelY = my + ny * labelDistance;

  // Label rotation: follow arrow angle, flip if pointing leftward to keep text readable
  const angleDeg = Math.atan2(ny, nx) * (180 / Math.PI);
  const labelAngle = Math.abs(angleDeg) > 90 ? angleDeg + 180 : angleDeg;

  // Unique filter ID for this edge's label background
  const filterId = `label-bg-${id}`;

  return (
    <g>
      <defs>
        <filter id={filterId} x="-2%" y="-10%" width="104%" height="120%">
          <feFlood floodColor={labelBgColor} result="bg" />
          <feMerge>
            <feMergeNode in="bg" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Source half-arrow: source → midpoint (out-traffic) */}
      <path d={`M ${sx} ${sy} L ${mx - nx * tipLength} ${my - ny * tipLength}`} stroke={outColor} strokeWidth={strokeWidth} fill="none" strokeLinecap="butt" />
      {drawPencilTip(sx, sy, mx, my, outColor, strokeWidth, tipLength)}

      {/* Target half-arrow: target → midpoint (in-traffic) */}
      <path d={`M ${tx} ${ty} L ${mx + nx * tipLength} ${my + ny * tipLength}`} stroke={inColor} strokeWidth={strokeWidth} fill="none" strokeLinecap="butt" />
      {drawPencilTip(tx, ty, mx, my, inColor, strokeWidth, tipLength)}

      {/* Speed labels (omitted when no data) */}
      {outSpeed && (
        <g transform={`rotate(${labelAngle}, ${outLabelX}, ${outLabelY})`}>
          <text x={outLabelX} y={outLabelY} textAnchor="middle" dy="0.5cap" fontSize={labelFontSize} fill={outColor} filter={`url(#${filterId})`}>
            {outSpeed}
          </text>
        </g>
      )}
      {inSpeed && (
        <g transform={`rotate(${labelAngle}, ${inLabelX}, ${inLabelY})`}>
          <text x={inLabelX} y={inLabelY} textAnchor="middle" dy="0.5cap" fontSize={labelFontSize} fill={inColor} filter={`url(#${filterId})`}>
            {inSpeed}
          </text>
        </g>
      )}
    </g>
  );
};
