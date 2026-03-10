import { PanelData, FieldType } from '@grafana/data';
import { LinkTrafficQueryConfig, NodeHealthQueryConfig, HealthStatus } from '../types';

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

/**
 * Find the time series matching a given node instance for health status.
 *
 * Frames are filtered by queryConfig.refId. Labels are checked on numeric fields.
 * Matching is exact string comparison (case-sensitive, no normalization).
 * Returns the last value in the matched series, or null if no series matches or has no data.
 *
 * The returned value is interpreted as: 1 → 'up', 0 → 'down', anything else → 'unavailable'.
 */
export function findHealthSeries(
  data: PanelData,
  queryConfig: NodeHealthQueryConfig,
  nodeName: string
): HealthStatus {
  for (const frame of data.series) {
    if (frame.refId !== queryConfig.refId) {
      continue;
    }

    for (const field of frame.fields) {
      if (field.type !== 'number') {
        continue;
      }

      const labels = field.labels ?? {};
      if (labels[queryConfig.instanceLabelKey] === nodeName) {
        const len = field.values.length;
        if (len === 0) {
          return 'unavailable';
        }
        const lastValue = field.values[len - 1];
        if (typeof lastValue === 'number' && isFinite(lastValue)) {
          return lastValue > 0 ? 'up' : 'down';
        }
        return 'unavailable';
      }
    }
  }

  return 'unavailable';
}

export interface HealthTimeSeries {
  statuses: HealthStatus[];
  timestamps: number[]; // ms epoch, same length as statuses
}

/**
 * Extract the full health time series for a node.
 *
 * Returns parallel arrays of HealthStatus values and timestamps (ms).
 * Returns empty arrays when no matching series is found.
 * Values are encoded the same as findHealthSeries: >0 → 'up', 0 → 'down', else → 'unavailable'.
 */
export function findHealthTimeSeries(
  data: PanelData,
  queryConfig: NodeHealthQueryConfig,
  nodeName: string
): HealthTimeSeries {
  for (const frame of data.series) {
    if (frame.refId !== queryConfig.refId) {
      continue;
    }

    const timeField = frame.fields.find((f) => f.type === FieldType.time);

    for (const field of frame.fields) {
      if (field.type !== FieldType.number) {
        continue;
      }

      const labels = field.labels ?? {};
      if (labels[queryConfig.instanceLabelKey] !== nodeName) {
        continue;
      }

      const len = field.values.length;
      const statuses: HealthStatus[] = [];
      const timestamps: number[] = [];

      for (let i = 0; i < len; i++) {
        const v = field.values[i];
        let status: HealthStatus;
        if (typeof v === 'number' && isFinite(v)) {
          status = v > 0 ? 'up' : 'down';
        } else {
          status = 'unavailable';
        }
        statuses.push(status);
        timestamps.push(timeField != null ? (timeField.values[i] as number) : i);
      }

      return { statuses, timestamps };
    }
  }

  return { statuses: [], timestamps: [] };
}
