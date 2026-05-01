import { css } from '@emotion/css';
import type { GrafanaTheme2 } from '@grafana/data';
import { useStyles2 } from '@grafana/ui';
import { type Edge, EdgeLabelRenderer, type EdgeProps } from '@xyflow/react';
import React from 'react';

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
  borderColor: string;
  strokeWidth: number;
  tipLength: number;
}

// Canonical coords: tip at origin, pointing +x. Caller applies group transform.
const PencilTip: React.FC<PencilTipProps> = ({ color, borderColor, strokeWidth, tipLength }) => {
  const hw = strokeWidth / 2;
  const slantLen = Math.sqrt(tipLength ** 2 + hw ** 2);
  const d = BORDER_WIDTH;

  // Outer triangle (borderColor): L=(-tipLength,-hw), T=(0,0), R=(-tipLength,hw)
  const outerPts = `${-tipLength},${-hw} 0,0 ${-tipLength},${hw}`;

  // Inner triangle (color): slant edges inset by d, base unchanged
  //   L' = (-tipLength, -(hw - d·slantLen/tipLength))
  //   T' = (-d·slantLen/hw, 0)
  //   R' = (-tipLength,  hw - d·slantLen/tipLength)
  const insetHw = hw - (d * slantLen) / tipLength;
  const insetTipX = (-d * slantLen) / hw;
  const innerPts = `${-tipLength},${-insetHw} ${insetTipX},0 ${-tipLength},${insetHw}`;

  return (
    <>
      <polygon points={outerPts} fill={borderColor} />
      <polygon points={innerPts} fill={color} />
    </>
  );
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
const Arrow: React.FC<ArrowProps> = ({ len, angleDeg, tipX, tipY, color, borderColor, strokeWidth, tipLength }) => (
  <g transform={`translate(${tipX}, ${tipY}) rotate(${angleDeg})`}>
    <path
      d={`M ${-len},0 L ${-tipLength},0`}
      stroke={borderColor}
      strokeWidth={strokeWidth}
      fill="none"
      strokeLinecap="butt"
    />
    <path
      d={`M ${-len},0 L ${-tipLength},0`}
      stroke={color}
      strokeWidth={strokeWidth - BORDER_WIDTH * 2}
      fill="none"
      strokeLinecap="butt"
    />
    <PencilTip color={color} borderColor={borderColor} strokeWidth={strokeWidth} tipLength={tipLength} />
  </g>
);

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

  const styles = useStyles2(getStyles, { labelBgColor, labelFontSize });

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

  // When A→Z points leftward, flip 180° so both labels remain readable
  const displayAngle = atozNeedsFlip ? angleDeg + 180 : angleDeg;

  // In the rotated frame, A→Z is on the -x side (source) without flip, +x side with flip.
  // We position the near edge of each label at labelDistance from the midpoint:
  //   translateX moves along the rotated edge axis by ±labelDistance,
  //   then translate(-100%, -50%) or translate(0%, -50%) flushes the near edge to that point.
  const atozLabelOffset = atozNeedsFlip ? labelDistance : -labelDistance;
  const atozLabelXAlign = atozNeedsFlip ? '0%' : '-100%';
  const ztoaLabelOffset = atozNeedsFlip ? -labelDistance : labelDistance;
  const ztoaLabelXAlign = atozNeedsFlip ? '-100%' : '0%';

  const labelStyle = (offset: number, xAlign: string, borderColor: string): React.CSSProperties => ({
    transform: `translate(${tipX}px, ${tipY}px) rotate(${displayAngle}deg) translateX(${offset}px) translate(${xAlign}, -50%)`,
    color: borderColor,
  });

  return (
    <>
      <g data-testid={`iwm-edge-${id}`} transform={`translate(${ox}, ${oy})`}>
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
      <EdgeLabelRenderer>
        {atozSpeed && (
          <div
            className={styles.label}
            style={labelStyle(atozLabelOffset, atozLabelXAlign, atozBorderColor)}
            data-testid={`iwm-edge-${id}-atoz-label`}
          >
            {atozSpeed}
          </div>
        )}
        {ztoaSpeed && (
          <div
            className={styles.label}
            style={labelStyle(ztoaLabelOffset, ztoaLabelXAlign, ztoaBorderColor)}
            data-testid={`iwm-edge-${id}-ztoa-label`}
          >
            {ztoaSpeed}
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
});

const getStyles = (
  theme: GrafanaTheme2,
  { labelBgColor, labelFontSize }: { labelBgColor: string; labelFontSize: number },
) => ({
  label: css({
    position: 'absolute',
    transformOrigin: '0 0',
    borderRadius: '2px',
    padding: theme.spacing(0, 0.25),
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    background: labelBgColor,
    lineHeight: 1,
    fontSize: labelFontSize,
    fontVariantNumeric: 'tabular-nums',
  }),
});
