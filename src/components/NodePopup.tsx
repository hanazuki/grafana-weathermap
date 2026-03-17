import React, { useId } from 'react';
import { GrafanaTheme2 } from '@grafana/data';
import { useStyles2 } from '@grafana/ui';
import { css } from '@emotion/css';
import { NodeConfig, HealthStatus } from '../types';
import { UptimeBar } from './UptimeBar';

const POPUP_WIDTH = 220;
const INDICATOR_SIZE = 10;

interface HealthIconProps {
  healthStatus: HealthStatus;
}

const HealthIcon: React.FC<HealthIconProps> = ({ healthStatus }) => {
  const styles = useStyles2(getStyles, healthStatus);
  const labelId = useId();

  if (healthStatus === null) {
    return null;
  }

  const r = INDICATOR_SIZE / 2;
  const cx = INDICATOR_SIZE;
  const cy = INDICATOR_SIZE;
  const slash = r / Math.SQRT2;

  const label = healthStatus === 'up' ? 'Up' : healthStatus === 'down' ? 'Down' : 'Unknown';

  return (
    <svg
      width={INDICATOR_SIZE * 2}
      height={INDICATOR_SIZE * 2}
      role="img"
      aria-labelledby={labelId}
      className={styles.healthIconSvg}
    >
      <title id={labelId}>Health: {label}</title>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={healthStatus === 'up' ? styles.healthIconColor : 'none'}
        stroke={styles.healthIconColor}
        strokeWidth={1.5}
      />
      {healthStatus === 'down' && (
        <line
          x1={cx - slash}
          y1={cy + slash}
          x2={cx + slash}
          y2={cy - slash}
          stroke={styles.healthIconColor}
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
  const styles = useStyles2(getStyles);

  const showUptimeBar =
    node.statusQueryId != null &&
    healthTimeSeries != null &&
    panelFrom != null &&
    panelTo != null &&
    maxDataPoints != null;

  return (
    <div className={styles.popup}>
      {/* Header: health icon + node name */}
      <div className={styles.header}>
        {healthStatus !== null && <HealthIcon healthStatus={healthStatus} />}
        <span className={styles.name}>
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

const getStyles = (theme: GrafanaTheme2, healthStatus?: HealthStatus) => {
  const indicatorColor =
    healthStatus === 'up'
      ? theme.colors.success.main
      : healthStatus === 'down'
        ? theme.colors.error.main
        : theme.colors.text.secondary; // was colors.secondary.text — bug fix

  return {
    // HealthIcon
    healthIconSvg: css({ flexShrink: 0 }),
    healthIconColor: indicatorColor, // plain string, used as SVG fill/stroke attribute

    // NodePopup
    popup: css({
      width: POPUP_WIDTH,
      fontSize: theme.typography.bodySmall.fontSize,
      color: theme.colors.text.primary,
      background: theme.colors.background.secondary,
      border: `1px solid ${theme.colors.border.medium}`,
      borderRadius: theme.shape.radius.default,
      overflow: 'hidden',
    }),
    header: css({ padding: theme.spacing(1, 1.5), display: 'flex', alignItems: 'center', gap: theme.spacing(0.75) }),
    name: css({ fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }),
  };
};
