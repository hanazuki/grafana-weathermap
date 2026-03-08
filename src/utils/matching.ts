import { PanelData } from '@grafana/data';
import { LinkTrafficQueryConfig } from '../types';

export interface MatchResult {
  /** The last numeric value of the matched series, or null if the series has no data. */
  value: number | null;
  /** True if a matching series was found (even if it has no data points). */
  found: boolean;
}

/**
 * Find the time series matching a given instance + interface combination.
 *
 * Frames are filtered by queryConfig.refId. Labels are checked on numeric fields.
 * Matching is exact string comparison (case-sensitive, no normalization).
 * Returns { found: false } when no series matches; no fallback to the other side.
 */
export function findTrafficSeries(
  data: PanelData,
  queryConfig: LinkTrafficQueryConfig,
  instance: string,
  iface: string
): MatchResult {
  for (const frame of data.series) {
    if (frame.refId !== queryConfig.refId) {
      continue;
    }

    for (const field of frame.fields) {
      if (field.type !== 'number') {
        continue;
      }

      const labels = field.labels ?? {};
      if (labels[queryConfig.instanceLabelKey] === instance && labels[queryConfig.interfaceLabelKey] === iface) {
        const len = field.values.length;
        if (len === 0) {
          return { value: null, found: true };
        }
        const lastValue = field.values[len - 1];
        const numeric = typeof lastValue === 'number' && isFinite(lastValue) ? lastValue : null;
        return { value: numeric, found: true };
      }
    }
  }

  return { value: null, found: false };
}
