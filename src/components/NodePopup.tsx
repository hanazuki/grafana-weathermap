import React, { useId } from 'react';
import { useTheme2 } from '@grafana/ui';
import { NodeConfig, HealthStatus } from '../types';

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
}

export const NodePopup: React.FC<NodePopupProps> = ({ node, healthStatus }) => {
  const theme = useTheme2();

  return (
    <div
      style={{
        width: 220,
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: theme.typography.bodySmall.fontSize,
        color: theme.colors.text.primary,
        background: theme.colors.background.secondary,
        border: `1px solid ${theme.colors.border.medium}`,
        borderRadius: theme.shape.radius.default,
      }}
    >
      {healthStatus !== null && <HealthIcon healthStatus={healthStatus} />}
      <span style={{ fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {node.name !== '' ? node.name : `#${node.id}`}
      </span>
    </div>
  );
};
