const SI_PREFIXES = ['', 'K', 'M', 'G', 'T', 'P'];
const BPS = 'bps';
const NNBSP = '\u202f';

/**
 * Format a value with automatic SI prefix scaling.
 */
export function formatSI(value: number): string {
  if (!isFinite(value) || value < 0) {
    return `0${NNBSP}`;
  }

  let prefixIndex = 0;
  while (value >= 1000 && prefixIndex < SI_PREFIXES.length - 1) {
    value /= 1000;
    prefixIndex++;
  }

  const formatted = value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2);
  return `${formatted}${NNBSP}${SI_PREFIXES[prefixIndex]}`;
}

/**
 * Format a bps value with automatic SI prefix scaling.
 */
export function formatBps(bps: number): string {
  return formatSI(bps) + BPS;
}
