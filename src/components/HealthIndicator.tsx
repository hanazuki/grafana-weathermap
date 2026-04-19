import type { GrafanaTheme2 } from '@grafana/data';
import { useStyles2 } from '@grafana/ui';
import type React from 'react';
import { useId } from 'react';
import type { HealthStatus } from '../types';

const SIZE = 10;

interface HealthIndicatorProps {
  healthStatus: HealthStatus | null;
  className?: string;
}

export const HealthIndicator: React.FC<HealthIndicatorProps> = ({ healthStatus, className }) => {
  const styles = useStyles2(getStyles, healthStatus);
  const labelId = useId();

  const r = SIZE / 2;
  const cx = SIZE;
  const cy = SIZE;
  const slash = r / Math.SQRT2;
  const label = healthStatus === 'up' ? 'Up' : healthStatus === 'down' ? 'Down' : 'Unknown';

  return (
    <svg width={SIZE * 2} height={SIZE * 2} role="img" aria-labelledby={labelId} className={className}>
      <title id={labelId}>Health: {label}</title>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={healthStatus === 'up' ? styles.color : 'none'}
        stroke={styles.color}
        strokeWidth={1.5}
      />
      {healthStatus === 'down' && (
        <line x1={cx - slash} y1={cy + slash} x2={cx + slash} y2={cy - slash} stroke={styles.color} strokeWidth={1.5} />
      )}
    </svg>
  );
};

const getStyles = (theme: GrafanaTheme2, healthStatus: HealthStatus | null) => {
  const color =
    healthStatus === 'up'
      ? theme.colors.success.main
      : healthStatus === 'down'
        ? theme.colors.error.main
        : theme.colors.text.secondary;

  return { color };
};
