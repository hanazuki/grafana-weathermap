import { type Edge, EdgeLabelRenderer, type EdgeProps } from '@xyflow/react';
import React, { useId } from 'react';

const BORDER_WIDTH = 0.5;

export interface WeathermapEdgeData {
  atozColor: string;
  ztoaColor: string;
  atozSpeed: string | null;
  ztoaSpeed: string | null;
  /** Perpendicular offset in pixels (positive = right of A→Z vector). */
  offsetPx: number;
  hasConfigError: boolean;
  labelBgColor: string;
  strokeWidth: number;
  tipLength: number;
  labelDistance: number;
  labelFontSize: number;
  [key: string]: unknown;
}

interface PencilTipProps {
  color: string;
  strokeWidth: number;
  tipLength: number;
}

// Canonical coords: tip at origin, pointing +x. Caller applies group transform.
const PencilTip: React.FC<PencilTipProps> = ({ color, strokeWidth, tipLength }) => {
  const hw = strokeWidth / 2;
  const d = BORDER_WIDTH;
  const overlap = 0.5;
  const innerPts = `${-tipLength - overlap},${-hw + d} ${-tipLength},${-hw + d} 0,0 ${-tipLength},${hw - d} ${-tipLength - overlap},${hw - d}`;

  return <polygon points={innerPts} fill={color} />;
};

interface ArrowProps {
  /** Distance from tip (midpoint) to the far end (A or Z node). */
  len: number;
  /** Rotation angle in degrees: direction from far end toward tip. */
  angleDeg: number;
  /** SVG translate position of the tip. */
  tipX: number;
  tipY: number;
  color: string;
  borderColor: string;
  strokeWidth: number;
  tipLength: number;
}

// Drawn in canonical coords (tip at origin, pointing +x), placed via group transform.
const Arrow: React.FC<ArrowProps> = ({ len, angleDeg, tipX, tipY, color, borderColor, strokeWidth, tipLength }) => {
  const filterId = useId();
  const hw = strokeWidth / 2;

  return (
    <>
      <defs>
        {/* Dilate alpha outward, flood borderColor, composite to get border ring, merge behind source. */}
        <filter
          id={filterId}
          filterUnits="userSpaceOnUse"
          x={-(len + BORDER_WIDTH)}
          y={-(hw + BORDER_WIDTH)}
          width={len + 2 * BORDER_WIDTH}
          height={2 * (hw + BORDER_WIDTH)}
        >
          <feMorphology in="SourceAlpha" operator="dilate" radius={BORDER_WIDTH} result="dilated" />
          <feFlood floodColor={borderColor} result="flood" />
          <feComposite in="flood" in2="dilated" operator="in" result="border" />
          <feMerge>
            <feMergeNode in="border" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g transform={`translate(${tipX}, ${tipY}) rotate(${angleDeg})`}>
        <g filter={`url(#${filterId})`}>
          <path
            d={`M ${-len},0 L ${-tipLength},0`}
            stroke={color}
            strokeWidth={strokeWidth - BORDER_WIDTH * 2}
            fill="none"
            strokeLinecap="butt"
          />
          <PencilTip color={color} strokeWidth={strokeWidth} tipLength={tipLength} />
        </g>
      </g>
    </>
  );
};

type WeathermapEdgeProps = EdgeProps<Edge<WeathermapEdgeData>>;

export const WeathermapEdge = React.memo<WeathermapEdgeProps>(({ id, sourceX, sourceY, targetX, targetY, data }) => {
  const {
    atozColor,
    ztoaColor,
    atozSpeed,
    ztoaSpeed,
    offsetPx = 0,
    labelBgColor = 'transparent',
    strokeWidth = 4,
    tipLength = 8,
    labelDistance = 40,
    labelFontSize = 10,
  } = /* biome-ignore lint/style/noNonNullAssertion: data is always provided when creating edges*/ data!;

  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const len = Math.sqrt(dx * dx + dy * dy);

  if (len < tipLength * 2) {
    return null;
  }

  // Perpendicular offset applied as a group translate
  const ox = (dy / len) * offsetPx;
  const oy = (-dx / len) * offsetPx;

  const mx = (sourceX + targetX) / 2;
  const my = (sourceY + targetY) / 2;

  const halfLen = len / 2;
  const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);

  const lshift = (color: string) =>
    `light-dark(oklch(from ${color} calc(l - 0.3) c h), oklch(from ${color} calc(l + 0.3) c h))`;
  const atozBorderColor = lshift(atozColor);
  const ztoaBorderColor = lshift(ztoaColor);

  const atozNeedsFlip = Math.abs(angleDeg) > 90;

  // Tip position in panel space (midpoint + perpendicular offset)
  const tipX = mx + ox;
  const tipY = my + oy;
  const ux = dx / len;
  const uy = dy / len;

  const atozLabelX = tipX - labelDistance * ux;
  const atozLabelY = tipY - labelDistance * uy;
  const ztoaLabelX = tipX + labelDistance * ux;
  const ztoaLabelY = tipY + labelDistance * uy;

  // When A→Z points leftward, flip 180° so both labels remain readable
  const displayAngle = atozNeedsFlip ? angleDeg + 180 : angleDeg;

  const labelStyle = (labelX: number, labelY: number, borderColor: string): React.CSSProperties => ({
    position: 'absolute',
    transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px) rotate(${displayAngle}deg)`,
    background: labelBgColor,
    borderRadius: '2px',
    color: borderColor,
    fontSize: labelFontSize,
    padding: '0 2px',
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
  });

  return (
    <>
      <g data-testid={`iwm-edge-${id}`}>
        <g transform={`translate(${ox}, ${oy})`}>
          {/* A half-arrow: A node → midpoint (A→Z traffic) */}
          <Arrow
            len={halfLen}
            angleDeg={angleDeg}
            tipX={mx}
            tipY={my}
            color={atozColor}
            borderColor={atozBorderColor}
            strokeWidth={strokeWidth}
            tipLength={tipLength}
          />

          {/* Z half-arrow: Z node → midpoint (Z→A traffic) */}
          <Arrow
            len={halfLen}
            angleDeg={angleDeg + 180}
            tipX={mx}
            tipY={my}
            color={ztoaColor}
            borderColor={ztoaBorderColor}
            strokeWidth={strokeWidth}
            tipLength={tipLength}
          />
        </g>
      </g>
      <EdgeLabelRenderer>
        {atozSpeed && (
          <div style={labelStyle(atozLabelX, atozLabelY, atozBorderColor)} data-testid={`iwm-edge-${id}-atoz-label`}>
            {atozSpeed}
          </div>
        )}
        {ztoaSpeed && (
          <div style={labelStyle(ztoaLabelX, ztoaLabelY, ztoaBorderColor)} data-testid={`iwm-edge-${id}-ztoa-label`}>
            {ztoaSpeed}
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
});
