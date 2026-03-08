function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

function lerpColor(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number,
  t: number
): string {
  const r = lerp(r1, r2, t).toString(16).padStart(2, '0');
  const g = lerp(g1, g2, t).toString(16).padStart(2, '0');
  const b = lerp(b1, b2, t).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

// Anchor colors for green-yellow-red palette
const GREEN_R = 0,
  GREEN_G = 200,
  GREEN_B = 0;
const YELLOW_R = 255,
  YELLOW_G = 200,
  YELLOW_B = 0;
const RED_R = 200,
  RED_G = 0,
  RED_B = 0;

/**
 * 11 color stops for the green-yellow-red (classic MRTG/weathermap) palette.
 * Index 0 = 0%, index 10 = 100%. Green → Yellow → Red.
 */
export const GREEN_YELLOW_RED_STOPS: string[] = Array.from({ length: 11 }, (_, i) => {
  if (i <= 5) {
    return lerpColor(GREEN_R, GREEN_G, GREEN_B, YELLOW_R, YELLOW_G, YELLOW_B, i / 5);
  } else {
    return lerpColor(YELLOW_R, YELLOW_G, YELLOW_B, RED_R, RED_G, RED_B, (i - 5) / 5);
  }
});

/** Color for links with no data or no query configured. */
export const GRAY_COLOR = '#808080';

/**
 * Map a utilization percentage (0–100, clamped) to a color step index (0–10).
 *
 * Linear scale: step = floor(util / 10), clamped to 10.
 * Logarithmic scale: step = floor(log10(util + 1) / log10(101) × 10).
 */
export function getColorStep(utilPct: number, mode: 'linear' | 'log'): number {
  const clamped = Math.min(100, Math.max(0, utilPct));

  if (mode === 'linear') {
    return Math.min(10, Math.floor(clamped / 10));
  } else {
    // spec formula: floor(log10(util + 1) / log10(101) × 10)
    return Math.min(10, Math.floor((Math.log10(clamped + 1) / Math.log10(101)) * 10));
  }
}

/**
 * Return the hex color for a given traffic rate and link capacity.
 * Returns GRAY_COLOR when trafficBps is not finite or capacityBps is 0.
 */
export function getUtilizationColor(
  trafficBps: number,
  capacityBps: number,
  mode: 'linear' | 'log'
): string {
  if (!isFinite(trafficBps) || capacityBps <= 0) {
    return GRAY_COLOR;
  }
  const utilPct = (trafficBps / capacityBps) * 100;
  const step = getColorStep(utilPct, mode);
  return GREEN_YELLOW_RED_STOPS[step];
}
