import React from 'react';
import { useTheme2 } from '@grafana/ui';

import { GREEN_YELLOW_RED_STOPS } from '../utils/color';

interface ColorLegendProps {
  colorScaleMode: 'linear' | 'log';
}

/** Return the utilization % at which color step i begins (i = 0..10). */
function stepStartPct(i: number, mode: 'linear' | 'log'): number {
  if (mode === 'linear') {
    return i * 10;
  }
  if (i === 0) {
    return 0;
  }
  if (i === 10) {
    return 100;
  }
  return Math.pow(10, (i * Math.log10(101)) / 10) - 1;
}

const BAR_HEIGHT = 160;
const BAR_WIDTH = 16;

export function ColorLegend({ colorScaleMode }: ColorLegendProps) {
  const theme = useTheme2();

  const stops = GREEN_YELLOW_RED_STOPS.map((color, i) => ({
    color,
    pct: stepStartPct(i, colorScaleMode),
  }));

  const gradient = `linear-gradient(to bottom, ${stops.map(({ color, pct }) => `${color} ${pct.toFixed(2)}%`).join(', ')})`;

  return (
    <div
      style={{
        position: 'absolute',
        top: 8,
        left: 8,
        zIndex: 5,
        display: 'flex',
        alignItems: 'flex-start',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          width: BAR_WIDTH,
          height: BAR_HEIGHT,
          background: gradient,
          border: `1px solid ${theme.colors.border.medium}`,
          flexShrink: 0,
        }}
      />
      <div style={{ position: 'relative', height: BAR_HEIGHT, marginLeft: 4 }}>
        {stops.map(({ pct }, i) => (
          <span
            key={i}
            style={{
              position: 'absolute',
              top: `${(pct / 100) * BAR_HEIGHT}px`,
              transform: 'translateY(-50%)',
              fontSize: theme.typography.bodySmall.fontSize,
              color: theme.colors.text.secondary,
              lineHeight: 1,
              whiteSpace: 'nowrap',
            }}
          >
            {Math.round(pct)}%
          </span>
        ))}
      </div>
    </div>
  );
}
