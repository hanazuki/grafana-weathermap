import React, { useId } from 'react';
import { useTheme2 } from '@grafana/ui';
import { NodeConfig, HealthStatus } from '../types';
import { UptimeBar } from './UptimeBar';

const INDICATOR_SIZE = 10;

interface HealthIconProps {
  healthStatus: HealthStatus;
}

const HealthIcon: React.FC<HealthIconProps> = ({ healthStatus }) => {
  const theme = useTheme2();
  const labelId = useId();

  if (healthStatus === null) {
    return null;
  }

  const r = INDICATOR_SIZE / 2;
  const cx = INDICATOR_SIZE;
  const cy = INDICATOR_SIZE;
  const slash = r / Math.SQRT2;

  const color =
    healthStatus === 'up'
      ? theme.colors.success.main
      : healthStatus === 'down'
        ? theme.colors.error.main
        : theme.colors.secondary.text;

  const label = healthStatus === 'up' ? 'Up' : healthStatus === 'down' ? 'Down' : 'Unknown';

  return (
    <svg
      width={INDICATOR_SIZE * 2}
      height={INDICATOR_SIZE * 2}
      role="img"
      aria-labelledby={labelId}
      style={{ flexShrink: 0 }}
    >
      <title id={labelId}>Health: {label}</title>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={healthStatus === 'up' ? color : 'none'}
        stroke={color}
        strokeWidth={1.5}
      />
      {healthStatus === 'down' && (
        <line
          x1={cx - slash}
          y1={cy + slash}
          x2={cx + slash}
          y2={cy - slash}
          stroke={color}
          strokeWidth={1.5}
        />
      )}
    </svg>
  );
};

interface NodePopupProps {
  node: NodeConfig;
  healthStatus: HealthStatus;
  /** Full health time series for the uptime bar; only shown when statusQueryId is set. */
  healthTimeSeries?: { statuses: HealthStatus[]; timestamps: number[] };
  /** Panel time range and resolution for the uptime bar pixel-sweep algorithm. */
  panelFrom?: number;
  panelTo?: number;
  maxDataPoints?: number;
}

export const NodePopup: React.FC<NodePopupProps> = ({
  node,
  healthStatus,
  healthTimeSeries,
  panelFrom,
  panelTo,
  maxDataPoints,
}) => {
  const theme = useTheme2();

  const showUptimeBar =
    node.statusQueryId != null &&
    healthTimeSeries != null &&
    panelFrom != null &&
    panelTo != null &&
    maxDataPoints != null;

  return (
    <div
      style={{
        width: 220,
        fontSize: theme.typography.bodySmall.fontSize,
        color: theme.colors.text.primary,
        background: theme.colors.background.secondary,
        border: `1px solid ${theme.colors.border.medium}`,
        borderRadius: theme.shape.radius.default,
        overflow: 'hidden',
      }}
    >
      {/* Header: health icon + node name */}
      <div
        style={{
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {healthStatus !== null && <HealthIcon healthStatus={healthStatus} />}
        <span style={{ fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {node.name !== '' ? node.name : `#${node.id}`}
        </span>
      </div>

      {/* Uptime bar: only when statusQueryId is configured */}
      {showUptimeBar && (
        <UptimeBar
          statuses={healthTimeSeries!.statuses}
          timestamps={healthTimeSeries!.timestamps}
          panelFrom={panelFrom!}
          panelTo={panelTo!}
          maxDataPoints={maxDataPoints!}
        />
      )}
    </div>
  );
};
