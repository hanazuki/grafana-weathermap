import { css, cx } from '@emotion/css';
import type { GrafanaTheme2 } from '@grafana/data';
import { useStyles2, useTheme2 } from '@grafana/ui';
import { Handle, type Node, type NodeProps, Position, useConnection } from '@xyflow/react';
import React from 'react';
import type { HealthStatus } from '../types';
import { HealthIndicator } from './HealthIndicator';

const MOVE_ZONE_WIDTH = 32;

export interface WeathermapNodeData {
  id: number;
  label: string;
  nodeWidth: number;
  nodeHeight: number;
  hasConfigError: boolean;
  healthStatus: HealthStatus | null | undefined;
  isEditing: boolean;
  [key: string]: unknown;
}

type WeathermapNodeProps = NodeProps<Node<WeathermapNodeData>>;

export const WeathermapNode = React.memo<WeathermapNodeProps>(({ data, dragging }) => {
  const { id, label, nodeWidth, nodeHeight, hasConfigError, healthStatus, isEditing } = data;
  const styles = useStyles2(getStyles, nodeWidth, nodeHeight, hasConfigError);
  const theme = useTheme2();
  const connection = useConnection();
  const isDropTarget = connection.inProgress && connection.isValid && connection.toNode?.id === String(id);

  const gripColor = hasConfigError ? theme.colors.warning.main : theme.colors.border.medium;

  const editOverlay = isEditing && (
    <>
      <Handle
        type="target"
        position={Position.Left}
        id="connect-target"
        className={cx(styles.connectTarget, connection.inProgress && styles.connectTargetActive)}
      />
      <div className={cx('iwm-move-zone', styles.moveZone, dragging && styles.moveZoneDragging)}>
        <svg
          width={MOVE_ZONE_WIDTH}
          height={nodeHeight}
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
        >
          <title>Drag handle</title>
          <line x1={8} y1={18} x2={8} y2={nodeHeight - 8} stroke={gripColor} strokeWidth={2} />
          <line x1={12} y1={18} x2={12} y2={nodeHeight - 8} stroke={gripColor} strokeWidth={2} />
        </svg>
      </div>
      <Handle type="source" id="connect-source" position={Position.Right} className={styles.connectSource} />
    </>
  );

  return (
    <>
      <Handle type="source" position={Position.Top} className={styles.handle} />
      <Handle type="target" position={Position.Top} className={styles.handle} />
      <div
        className={cx(styles.node, isDropTarget && styles.dropTarget)}
        title={String(label)}
        data-testid={`iwm-node-${id}`}
      >
        {editOverlay}
        {healthStatus !== undefined ? (
          <HealthIndicator healthStatus={healthStatus} className={styles.healthIndicator} />
        ) : null}
        <span className={styles.label}>{label}</span>
      </div>
    </>
  );
});

const getStyles = (theme: GrafanaTheme2, nodeWidth: number, nodeHeight: number, hasConfigError: boolean) => ({
  handle: css({
    '&&': {
      width: 0,
      height: 0,
      minWidth: 0,
      minHeight: 0,
      background: 'transparent',
      border: 'none',
      borderRadius: 0,
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    },
  }),
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
  dropTarget: css({
    border: `2px solid ${theme.colors.primary.border}`,
  }),
  connectTarget: css({
    '&&': {
      position: 'absolute',
      left: 0,
      top: 0,
      width: nodeWidth,
      height: nodeHeight,
      background: 'transparent',
      border: 'none',
      borderRadius: 0,
      transform: 'none',
      zIndex: -1,
      pointerEvents: 'none',
    },
  }),
  connectTargetActive: css({
    '&&': { zIndex: 10, pointerEvents: 'auto' },
  }),
  connectSource: css({
    '&&': {
      position: 'absolute',
      left: MOVE_ZONE_WIDTH,
      top: 0,
      width: nodeWidth - MOVE_ZONE_WIDTH,
      height: nodeHeight,
      cursor: 'crosshair',
      background: 'transparent',
      border: 'none',
      borderRadius: 0,
      transform: 'none',
      zIndex: 1,
    },
  }),
  moveZone: css({
    position: 'absolute',
    left: 0,
    top: 0,
    width: MOVE_ZONE_WIDTH,
    height: nodeHeight,
    cursor: 'grab',
    zIndex: 1,
  }),
  moveZoneDragging: css({ cursor: 'grabbing' }),
  healthIndicator: css({ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }),
  label: css({ fontWeight: 'bold' }),
});
