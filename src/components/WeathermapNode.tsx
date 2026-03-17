import React, { useId } from 'react';
import { GrafanaTheme2 } from '@grafana/data';
import { useTheme2, useStyles2 } from '@grafana/ui';
import { css } from '@emotion/css';
import { Handle, NodeProps, Position } from '@xyflow/react';
import { HealthStatus } from '../types';

const HEALTH_INDICATOR_SIZE = 10;

export interface WeathermapNodeData {
  id: number;
  label: string;
  nodeWidth: number;
  nodeHeight: number;
  hasConfigError: boolean;
  healthStatus: HealthStatus;
  [key: string]: unknown;
}

export const WeathermapNode: React.FC<NodeProps> = ({ data }) => {
  const { id, label, nodeWidth, nodeHeight, hasConfigError, healthStatus } = data as WeathermapNodeData;
  const t = useTheme2();
  const styles = useStyles2(getStyles, nodeWidth, nodeHeight, hasConfigError);

  const r = HEALTH_INDICATOR_SIZE / 2;
  const cx = HEALTH_INDICATOR_SIZE;
  const cy = HEALTH_INDICATOR_SIZE;
  const slash = r / Math.SQRT2;

  const healthIndicatorLabelId = useId();

  const healthIndicator = () => {
    if (healthStatus === null) {
      return null;
    }

    const color =
      healthStatus === 'up'
        ? t.colors.success.main
        : healthStatus === 'down'
          ? t.colors.error.main
          : t.colors.text.secondary;

    const healthLabel = healthStatus === 'up' ? 'Up' : healthStatus === 'down' ? 'Down' : 'Unknown';

    const labelId = healthIndicatorLabelId;

    return (
      <svg
        width={HEALTH_INDICATOR_SIZE * 2}
        height={HEALTH_INDICATOR_SIZE * 2}
        className={styles.healthIndicator}
        role="img"
        aria-labelledby={labelId}
      >
        <title id={labelId}>Health: {healthLabel}</title>
        <circle cx={cx} cy={cy} r={r} fill={healthStatus === 'up' ? color : "none"} stroke={color} strokeWidth={1.5} />
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

  return (
    <>
      <Handle type="source" position={Position.Top} className={styles.handle} style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
      <Handle type="target" position={Position.Top} className={styles.handle} style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
      <div className={styles.node} title={String(label)} data-testid={`iwm-node-${id}`}>
        {healthIndicator()}
        <span className={styles.label}>{label}</span>
      </div>
    </>
  );
};

const getStyles = (theme: GrafanaTheme2, nodeWidth: number, nodeHeight: number, hasConfigError: boolean) => ({
  handle: css({ width: 0, height: 0, minWidth: 0, minHeight: 0, background: 'transparent', border: 'none', borderRadius: 0, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }),
  node: css({
    width: nodeWidth,
    height: nodeHeight,
    background: theme.colors.background.secondary,
    border: `2px solid ${hasConfigError ? theme.colors.warning.main : theme.colors.border.medium}`,
    borderRadius: theme.shape.radius.default,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.text.primary,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    padding: `0 ${theme.spacing(1)}`,
    boxSizing: 'border-box',
    position: 'relative',
  }),
  healthIndicator: css({ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }),
  label: css({ fontWeight: 'bold' }),
});
