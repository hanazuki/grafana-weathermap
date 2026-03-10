import React, { useId } from 'react';
import { useTheme2 } from '@grafana/ui';
import { HealthStatus } from '../types';

const BAR_HEIGHT = 12;
const PIXEL_UNKNOWN = 0, PIXEL_UP = 1, PIXEL_DOWN = 2;

interface UptimeBarProps {
  statuses: HealthStatus[];
  timestamps: number[]; // ms epoch, same length as statuses; assumed sorted ascending
  panelFrom: number;    // data.timeRange.from.valueOf() — ms epoch
  panelTo: number;      // data.timeRange.to.valueOf() — ms epoch
  maxDataPoints: number; // data.request?.maxDataPoints ?? 1080
}

export const UptimeBar: React.FC<UptimeBarProps> = ({ statuses, timestamps, panelFrom, panelTo, maxDataPoints }) => {
  const theme = useTheme2();
  const colorFor = (v: number): string =>
    v === PIXEL_DOWN
      ? theme.colors.error.main
      : v === PIXEL_UP
        ? theme.colors.success.main
        : theme.colors.secondary.text;

  const N = maxDataPoints / 2; // Ensure every span includes datapoints.
  const totalSpan = panelTo - panelFrom;

  const generateSegments = () => {
    // Degenerate time range: show full gray bar.
    if (N <= 0 || totalSpan <= 0) {
      return <rect x={0} y={0} width={N} height={BAR_HEIGHT} fill={colorFor(PIXEL_UNKNOWN)} />;
    }

    const interval = totalSpan / N;

    // Priority: 'down' (2) > 'up' (1) > null (0); Math.max enforces it.
    const pixelValues = new Uint8Array(N); // initialized to 0 (gray/unknown)
    for (let k = 0; k < statuses.length; k++) {
      const i = Math.floor((timestamps[k] - panelFrom) / interval);
      if (i < 0 || i >= N) {
        continue;
      }
      const v = statuses[k] === 'down' ? PIXEL_DOWN : statuses[k] === 'up' ? PIXEL_UP : 0;
      pixelValues[i] = Math.max(pixelValues[i], v);
    }

    // RLE-compress consecutive same-value pixels into single rects.
    const rects: React.ReactElement[] = [];
    let segStart = 0;
    for (let i = 1; i <= N; i++) {
      if (i === N || pixelValues[i] !== pixelValues[segStart]) {
        rects.push(<rect key={segStart} x={segStart} y={0} width={i - segStart} height={BAR_HEIGHT} fill={colorFor(pixelValues[segStart])} />);
        segStart = i;
      }
    }

    return <>{rects}</>;
  };

  const titleId = useId();
  return <svg
    viewBox={`0 0 ${N} ${BAR_HEIGHT}`}
    preserveAspectRatio="none"
    width="100%"
    height={BAR_HEIGHT}
    style={{ display: 'block' }}
    role="img"
    aria-labelledby={titleId}
  >
    <title id={titleId}>Uptime history</title>
    {generateSegments()}
  </svg>

};
