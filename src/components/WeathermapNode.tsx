import React from 'react';
import { GrafanaTheme2 } from '@grafana/data';
import { useStyles2 } from '@grafana/ui';
import { css } from '@emotion/css';
import { Handle, NodeProps, Position } from '@xyflow/react';
import { HealthStatus } from '../types';
import { HealthIndicator } from './HealthIndicator';


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
  const styles = useStyles2(getStyles, nodeWidth, nodeHeight, hasConfigError);

  return (
    <>
      <Handle type="source" position={Position.Top} className={styles.handle} style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
      <Handle type="target" position={Position.Top} className={styles.handle} style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
      <div className={styles.node} title={String(label)} data-testid={`iwm-node-${id}`}>
        <HealthIndicator healthStatus={healthStatus} className={styles.healthIndicator} />
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
