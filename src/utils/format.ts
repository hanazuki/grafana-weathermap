const SI_PREFIXES = ['', 'K', 'M', 'G', 'T', 'P'];

/**
 * Format a bps value with automatic SI prefix scaling.
 * E.g. 1_500_000 → "1.50 Mbps"
 */
export function formatBps(bps: number): string {
  if (!isFinite(bps) || bps < 0) {
    return '0 bps';
  }

  let value = bps;
  let prefixIndex = 0;

  while (value >= 1000 && prefixIndex < SI_PREFIXES.length - 1) {
    value /= 1000;
    prefixIndex++;
  }

  let formatted: string;
  if (value >= 100) {
    formatted = value.toFixed(0);
  } else if (value >= 10) {
    formatted = value.toFixed(1);
  } else {
    formatted = value.toFixed(2);
  }

  return `${formatted}\u202f${SI_PREFIXES[prefixIndex]}bps`;
}
