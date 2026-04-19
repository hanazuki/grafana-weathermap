import type { EdgeProps } from '@xyflow/react';
import type React from 'react';
import { useId } from 'react';

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
  children?: React.ReactNode;
}

// Drawn in canonical coords (tip at origin, pointing +x), placed via group transform.
// Children are rendered in the same canonical coordinate space.
const Arrow: React.FC<ArrowProps> = ({
  len,
  angleDeg,
  tipX,
  tipY,
  color,
  borderColor,
  strokeWidth,
  tipLength,
  children,
}) => {
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
        {children}
      </g>
    </>
  );
};

export const WeathermapEdge: React.FC<EdgeProps> = ({ id, sourceX, sourceY, targetX, targetY, data }) => {
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
  } = (data as WeathermapEdgeData) ?? {};

  const filterId = useId();

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

  // Text flip: when the arrow points leftward the rotated text is upside-down.
  // The A-to-Z-arrow points at angleDeg; the Z-to-A-arrow points the opposite way.
  const atozNeedsFlip = Math.abs(angleDeg) > 90;
  const ztoaNeedsFlip = !atozNeedsFlip;

  const label = (text: string, color: string, needsFlip: boolean, testId: string) => (
    <g transform={needsFlip ? `rotate(180, ${-labelDistance}, 0)` : undefined}>
      <text
        x={-labelDistance}
        y={0}
        textAnchor={needsFlip ? 'start' : 'end'}
        dy="0.5cap"
        fontSize={labelFontSize}
        fill={color}
        filter={`url(#${filterId})`}
        data-testid={testId}
      >
        {text}
      </text>
    </g>
  );

  return (
    <g data-testid={`iwm-edge-${id}`}>
      <defs>
        <filter id={filterId} x="-2%" y="-0%" width="104%" height="100%">
          <feFlood floodColor={labelBgColor} result="bg" />
          <feMerge>
            <feMergeNode in="bg" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

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
        >
          {atozSpeed && label(atozSpeed, atozBorderColor, atozNeedsFlip, `iwm-edge-${id}-atoz-label`)}
        </Arrow>

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
        >
          {ztoaSpeed && label(ztoaSpeed, ztoaBorderColor, ztoaNeedsFlip, `iwm-edge-${id}-ztoa-label`)}
        </Arrow>
      </g>
    </g>
  );
};
