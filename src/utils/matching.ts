import { type DataFrame, type Field, FieldType, getTimeField, type PanelData } from '@grafana/data';
import type { HealthStatus, LinkTrafficQueryConfig, NodeHealthQueryConfig, TimeSeries } from '../types';

function makeTimeSeries<T>(
  field: Field,
  timeField: Field,
  decode: (v: unknown) => T | null,
  maxAgeMs?: number,
  referenceMs?: number,
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
      const timestamp = timeField.values[len - 1] as number;
      if (maxAgeMs !== undefined && referenceMs !== undefined && referenceMs - timestamp > maxAgeMs) {
        return null;
      }
      return { value, timestamp };
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
 * Find the traffic time series for a link.
 *
 * Frames are filtered by queryConfig.refId. The A-side or Z-side labels are
 * selected based on queryConfig.direction: 'egress' uses aNode labels,
 * 'ingress' uses zNode labels. Label matching is exact string comparison
 * (case-sensitive, no normalization). Returns null when no matching series is found.
 */
export function findTrafficTimeSeries({
  data,
  queryConfig,
  srcNode,
  dstNode,
  maxAgeMs,
}: {
  data: PanelData;
  queryConfig: LinkTrafficQueryConfig;
  srcNode: { name: string; iface: string };
  dstNode: { name: string; iface: string };
  maxAgeMs?: number;
}): TimeSeries<number> | null {
  const { name: instance, iface } = queryConfig.direction === 'egress' ? srcNode : dstNode;
  const referenceMs = data.timeRange?.to?.valueOf();

  for (const frame of data.series) {
    if (frame.refId !== queryConfig.refId) {
      continue;
    }

    const { timeField } = getTimeField(frame);
    if (!timeField) {
      return null;
    }

    for (const field of frame.fields) {
      if (field.type !== FieldType.number) {
        continue;
      }

      const labels = field.labels ?? {};
      if (queryConfig.instanceLabelKey !== null && labels[queryConfig.instanceLabelKey] !== instance) {
        continue;
      }
      if (queryConfig.interfaceLabelKey !== null && labels[queryConfig.interfaceLabelKey] !== iface) {
        continue;
      }
      return makeTimeSeries(field, timeField, (v) => (Number.isFinite(v) ? (v as number) : null), maxAgeMs, referenceMs);
    }
  }

  return null;
}

export function collectLabels(data: DataFrame[], refId: string): string[] {
  const keys = new Set<string>();
  for (const frame of data) {
    if (frame.refId !== refId) {
      continue;
    }
    for (const field of frame.fields) {
      if (field.type !== FieldType.number) {
        continue;
      }
      for (const key of Object.keys(field.labels ?? {})) {
        keys.add(key);
      }
    }
  }
  return Array.from(keys).sort();
}

export function collectInterfaces(
  frames: DataFrame[],
  queries: LinkTrafficQueryConfig[],
  nodeName: string,
): Array<{ name: string; description: string | null }> {
  const names = new Set<string>();
  const descMap = new Map<string, { description: string; timestamp: number }>();

  for (const query of queries) {
    if (query.interfaceLabelKey === null) {
      continue;
    }
    const { interfaceLabelKey, instanceLabelKey, descriptionLabel, refId } = query;

    for (const frame of frames) {
      if (frame.refId !== refId) {
        continue;
      }

      const { timeField } = getTimeField(frame);
      if (!timeField) {
        continue;
      }

      const lastTimestamp = timeField.values[timeField.values.length - 1] as number;

      for (const field of frame.fields) {
        if (field.type !== FieldType.number) {
          continue;
        }

        const labels = field.labels ?? {};
        if (instanceLabelKey !== null && labels[instanceLabelKey] !== nodeName) {
          continue;
        }

        const ifaceName = labels[interfaceLabelKey];
        if (ifaceName === undefined) {
          continue;
        }

        const desc = descriptionLabel != null ? (labels[descriptionLabel] ?? null) : null;
        names.add(ifaceName);

        if (desc !== null) {
          const existing = descMap.get(ifaceName);
          if (!existing || lastTimestamp > existing.timestamp) {
            descMap.set(ifaceName, { description: desc, timestamp: lastTimestamp });
          }
        }
      }
    }
  }

  return Array.from(names)
    .sort()
    .map((name) => ({
      name,
      description: descMap.get(name)?.description ?? null,
    }));
}

function decodeHealthValue(v: unknown): HealthStatus | null {
  return typeof v === 'number' && Number.isFinite(v) ? (v > 0 ? 'up' : 'down') : null;
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
  nodeName: string,
  maxAgeMs?: number,
): TimeSeries<HealthStatus> | null {
  const referenceMs = data.timeRange?.to?.valueOf();

  for (const frame of data.series) {
    if (frame.refId !== queryConfig.refId) {
      continue;
    }

    const { timeField } = getTimeField(frame);
    if (!timeField) {
      return null;
    }

    for (const field of frame.fields) {
      if (field.type !== FieldType.number) {
        continue;
      }

      const labels = field.labels ?? {};
      if (queryConfig.instanceLabelKey !== null && labels[queryConfig.instanceLabelKey] !== nodeName) {
        continue;
      }

      return makeTimeSeries(field, timeField, decodeHealthValue, maxAgeMs, referenceMs);
    }
  }

  return null;
}
