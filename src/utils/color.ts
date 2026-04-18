import { interpolateCividis } from 'd3';

export type ColorScale = (t: number) => string;

export const rainbow = (t: number) => {
  t = Math.max(0, Math.min(1, t));

  const l_light = 0.65 - 0.25 * t;
  const l_dark = 0.55 + 0.25 * t;
  const c_light = 0.3;
  const c_dark = 0.2;
  const h = 570 - 240 * Math.pow(t, 1.2); // cyan to magenta

  return `light-dark(oklch(${l_light.toFixed(3)} ${c_light.toFixed(3)} ${h.toFixed(1)}deg), oklch(${l_dark.toFixed(3)} ${c_dark.toFixed(3)} ${h.toFixed(1)}deg))`;
};

export const colorScales = [
  { name: 'Rainbow', getColor: rainbow },
  { name: 'Cividis', getColor: interpolateCividis },
  { name: 'Mono', getColor: () => `light-dark(rgb(36, 41, 46), rgb(204, 204, 220))`, }
];

/** Color for links with no data or no query configured. */
export const GRAY_COLOR = '#808080';

/**
 * Map a utilization ratio (0–1 clamped, where 1 = 100% capacity) to a
 * continuous t value in [0,1] for use with a ColorScale.
 *
 * Linear scale: t = util (identity).
 * Logarithmic scale: t = log_b(util × (b−1) + 1)
 *   where b = logScaleBase (default 10, integer in [2, 10]).
 */
export function getColorT(t: number, mode: 'linear' | 'log', logScaleBase = 10): number {
  t = Math.min(1, Math.max(0, t));

  if (mode === 'linear') {
    return t;
  } else {
    const b = logScaleBase;
    return Math.min(1, Math.log(t * (b - 1) + 1) / Math.log(b));
  }
}

/**
 * Return the color for a given traffic rate and link capacity.
 * Returns GRAY_COLOR when trafficBps is not finite or capacityBps is 0.
 */
export function getUtilizationColor(
  current: number,
  capacity: number,
  mode: 'linear' | 'log',
  logScaleBase = 10,
  colorScale: ColorScale = rainbow
): string {
  if (!isFinite(current) || capacity <= 0) {
    return GRAY_COLOR;
  }
  return colorScale(getColorT(current / capacity, mode, logScaleBase));
}
