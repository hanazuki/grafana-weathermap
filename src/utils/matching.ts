import { PanelData, FieldType, getTimeField, type Field } from '@grafana/data';
import { LinkTrafficQueryConfig, NodeHealthQueryConfig, HealthStatus, TimeSeries } from '../types';

function makeTimeSeries<T>(
  field: Field,
  timeField: Field,
  decode: (v: unknown) => T | null
): TimeSeries<T> {
  return {
    getLatestValue() {
      const len = field.values.length;
      if (len === 0) {
        return null;
      }
      const value = decode(field.values[len - 1]);
      if (value === null) {
        return null;
      }
      return { value, timestamp: timeField.values[len - 1] as number };
    },
    getValues() {
      const values: T[] = [];
      const timestamps: number[] = [];
      for (let i = 0; i < field.values.length; i++) {
        const value = decode(field.values[i]);
        if (value !== null) {
          values.push(value);
          timestamps.push(timeField.values[i] as number);
        }
      }
      return { values, timestamps };
    },
  };
}

/**
 * Find the traffic time series for a link instance + interface combination.
 *
 * Frames are filtered by queryConfig.refId. Labels are checked on numeric fields.
 * Matching is exact string comparison (case-sensitive, no normalization).
 * Returns null when no matching series is found.
 */
export function findTrafficTimeSeries(
  data: PanelData,
  queryConfig: LinkTrafficQueryConfig,
  instance: string,
  iface: string
): TimeSeries<number> | null {
  for (const frame of data.series) {
    if (frame.refId !== queryConfig.refId) {
      continue;
    }

    const { timeField } = getTimeField(frame);
    if (!timeField) { return null; }

    for (const field of frame.fields) {
      if (field.type !== FieldType.number) {
        continue;
      }

      const labels = field.labels ?? {};
      if (labels[queryConfig.instanceLabelKey] === instance && labels[queryConfig.interfaceLabelKey] === iface) {
        return makeTimeSeries(field, timeField, v => Number.isFinite(v) ? v as number : null);
      }
    }
  }

  return null;
}

function decodeHealthValue(v: unknown): HealthStatus | null {
  return typeof v === 'number' && isFinite(v) ? (v > 0 ? 'up' : 'down') : null;
}


/**
 * Find the health time series for a node instance.
 *
 * Frames are filtered by queryConfig.refId. Labels are checked on numeric fields.
 * Matching is exact string comparison (case-sensitive, no normalization).
 * Returns null when no matching series is found.
 * Values are decoded as: >0 → 'up', 0 → 'down', non-finite → omitted.
 */
export function findHealthTimeSeries(
  data: PanelData,
  queryConfig: NodeHealthQueryConfig,
  nodeName: string
): TimeSeries<HealthStatus> | null {
  for (const frame of data.series) {
    if (frame.refId !== queryConfig.refId) {
      continue;
    }

    const { timeField } = getTimeField(frame);
    if (!timeField) { return null; }

    for (const field of frame.fields) {
      if (field.type !== FieldType.number) {
        continue;
      }

      const labels = field.labels ?? {};
      if (labels[queryConfig.instanceLabelKey] !== nodeName) {
        continue;
      }

      return makeTimeSeries(field, timeField, decodeHealthValue);
    }
  }

  return null;
}
