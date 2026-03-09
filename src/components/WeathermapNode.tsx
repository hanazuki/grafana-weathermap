import React from 'react';
import { Handle, NodeProps, Position } from '@xyflow/react';
import { GrafanaTheme2 } from '@grafana/data';
import { HealthStatus } from '../types';

const HEALTH_INDICATOR_SIZE = 10;

export interface WeathermapNodeData {
  label: string;
  nodeWidth: number;
  nodeHeight: number;
  theme: GrafanaTheme2;
  hasConfigError: boolean;
  healthStatus: HealthStatus;
  [key: string]: unknown;
}

const HANDLE_STYLE: React.CSSProperties = {
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
};

export const WeathermapNode: React.FC<NodeProps> = ({ data }) => {
  const { label, nodeWidth, nodeHeight, theme, hasConfigError, healthStatus } = data as WeathermapNodeData;
  const t = theme as GrafanaTheme2;

  const style: React.CSSProperties = {
    width: nodeWidth,
    height: nodeHeight,
    background: t.colors.background.secondary,
    border: `2px solid ${hasConfigError ? t.colors.warning.main : t.colors.border.medium}`,
    borderRadius: t.shape.radius.default,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: t.typography.bodySmall.fontSize,
    color: t.colors.text.primary,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    padding: '0 8px',
    boxSizing: 'border-box',
    position: 'relative',
  };

  const r = HEALTH_INDICATOR_SIZE / 2;
  const cx = HEALTH_INDICATOR_SIZE;
  const cy = HEALTH_INDICATOR_SIZE;
  const slash = r / Math.SQRT2;

  const healthIndicator = () => {
    if (healthStatus === null) {
      return null;
    }

    const color =
      healthStatus === 'up'
        ? t.colors.success.main
        : healthStatus === 'down'
          ? t.colors.error.main
          : t.colors.secondary.text;

    return (
      <svg
        width={HEALTH_INDICATOR_SIZE * 2}
        height={HEALTH_INDICATOR_SIZE * 2}
        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
      >
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
      <Handle type="source" position={Position.Top} style={HANDLE_STYLE} />
      <Handle type="target" position={Position.Top} style={HANDLE_STYLE} />
      <div style={style} title={String(label)}>
        {healthIndicator()}
        <span style={{ fontWeight: "bold" }}>{label}</span>
      </div>
    </>
  );
};
