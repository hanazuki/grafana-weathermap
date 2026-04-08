import React from 'react';
import { GrafanaTheme2 } from '@grafana/data';
import { useStyles2 } from '@grafana/ui';
import { css } from '@emotion/css';
import { NodeConfig, HealthStatus, TimeSeries } from '../types';
import { UptimeBar } from './UptimeBar';
import { HealthIndicator } from './HealthIndicator';

const POPUP_WIDTH = 220;

interface NodePopupProps {
  node: NodeConfig;
  healthStatus: HealthStatus | null | undefined;
  /** Full health time series for the uptime bar; only shown when statusQueryId is set. */
  healthTimeSeries?: TimeSeries<HealthStatus>;
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
        {healthStatus !== undefined ? <HealthIndicator healthStatus={healthStatus} className={styles.healthIcon} /> : null}
        <span className={styles.name}>
          {node.name !== '' ? node.name : `#${node.id}`}
        </span>
      </div>

      {/* Uptime bar: only when statusQueryId is configured */}
      {showUptimeBar && (() => {
        const { values, timestamps } = healthTimeSeries!.getValues();
        return (
          <UptimeBar
            statuses={values}
            timestamps={timestamps}
            panelFrom={panelFrom!}
            panelTo={panelTo!}
            maxDataPoints={maxDataPoints!}
          />
        );
      })()}
    </div>
  );
};

const getStyles = (theme: GrafanaTheme2) => ({
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
  healthIcon: css({ flexShrink: 0 }),
  name: css({ fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }),
});
