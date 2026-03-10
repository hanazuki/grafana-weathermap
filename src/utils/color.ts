export type ColorScale = (t: number) => string;

export const rainbow = (t: number) => {
  t = Math.max(0, Math.min(1, t));

  const l_light = 0.65 - 0.25 * t;
  const l_dark = 0.55 + 0.25 * t;
  const c_light = 0.3;
  const c_dark = 0.2;
  const h = 570 - 300 * Math.pow(t, 1.2); // cyan to magenta

  return `light-dark(oklch(${l_light.toFixed(3)} ${c_light.toFixed(3)} ${h.toFixed(1)}deg), oklch(${l_dark.toFixed(3)} ${c_dark.toFixed(3)} ${h.toFixed(1)}deg))`;
};

export const cividis = (t: number) => {
  t = Math.max(0, Math.min(1, t));

  let l, c, h;
  if (t < 0.5) {
    const nt = t * 2;
    l = 0.21 + (0.55 - 0.21) * nt;
    c = 0.07 + (0.01 - 0.07) * nt;
    h = 265 + (100 - 265) * nt;
  } else {
    const nt = (t - 0.5) * 2;
    l = 0.55 + (0.90 - 0.55) * nt;
    c = 0.01 + (0.18 - 0.01) * nt;
    h = 100;
  }

  return `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(1)})`;
};

export const colorScales = [
  { name: 'Rainbow', getColor: rainbow },
  { name: 'Cividis', getColor: cividis },
];

/**
 * 11 color stops for the green-yellow-red (classic MRTG/weathermap) palette.
 * Index 0 = 0%, index 10 = 100%. Green → Yellow → Red.
 */
export const GREEN_YELLOW_RED_STOPS: string[] = Array.from({ length: 11 }, (_, i) => {
  return rainbow(i / 11.0);
});

/** Color for links with no data or no query configured. */
export const GRAY_COLOR = '#808080';

/**
 * Map a utilization percentage (0–100, clamped) to a color step index (0–10).
 *
 * Linear scale: step = min(10, floor(util / 10)).
 * Logarithmic scale: step = floor(log_b(util × (b−1)/100 + 1) × 10)
 *   where b = logScaleBase (default 10, integer in [2, 10]).
 */
export function getColorStep(t: number, mode: 'linear' | 'log', logScaleBase = 10): number {
  const clamped = Math.min(100, Math.max(0, t));

  if (mode === 'linear') {
    return Math.min(10, Math.floor(clamped / 10));
  } else {
    const b = logScaleBase;
    return Math.min(10, Math.floor((Math.log(clamped * (b - 1) / 100 + 1) / Math.log(b)) * 10));
  }
}

/**
 * Return the hex color for a given traffic rate and link capacity.
 * Returns GRAY_COLOR when trafficBps is not finite or capacityBps is 0.
 */
export function getUtilizationColor(
  trafficBps: number,
  capacityBps: number,
  mode: 'linear' | 'log',
  logScaleBase = 10
): string {
  if (!isFinite(trafficBps) || capacityBps <= 0) {
    return GRAY_COLOR;
  }
  const utilPct = (trafficBps / capacityBps) * 100;
  const step = getColorStep(utilPct, mode, logScaleBase);
  return GREEN_YELLOW_RED_STOPS[step];
}
