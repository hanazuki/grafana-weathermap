import React from 'react';
import { useTheme2 } from '@grafana/ui';

import { GREEN_YELLOW_RED_STOPS } from '../utils/color';

interface ColorLegendProps {
  colorScaleMode: 'linear' | 'log';
  logScaleBase: number;
}

/** Return the utilization % at which color step i begins (i = 0..10). */
function stepStartPct(i: number, mode: 'linear' | 'log', logScaleBase: number): number {
  if (mode === 'linear') {
    return i * 10;
  }
  // Inverse of: step = floor(log_b(util × (b−1)/100 + 1) × 10)
  // util = (b^(i/10) − 1) × 100 / (b−1)
  const b = logScaleBase;
  return (Math.pow(b, i / 10) - 1) * 100 / (b - 1);
}

const BAR_HEIGHT = 160;
const BAR_WIDTH = 16;

export function ColorLegend({ colorScaleMode, logScaleBase }: ColorLegendProps) {
  const theme = useTheme2();

  const stops = GREEN_YELLOW_RED_STOPS.map((color, i) => ({
    color,
    pct: stepStartPct(i, colorScaleMode, logScaleBase),
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
        {stops.map(({ pct }, i) => {
          const label = String(Math.round(pct));
          const pad = '\u2007'.repeat(Math.max(0, 3 - label.length));
          return (
            <span
              key={i}
              style={{
                position: 'absolute',
                top: `${(pct / 100) * BAR_HEIGHT}px`,
                transform: 'translateY(-50%)',
                fontSize: theme.typography.bodySmall.fontSize,
                fontVariantNumeric: 'tabular-nums',
                color: theme.colors.text.secondary,
                lineHeight: 1,
                whiteSpace: 'pre',
              }}
            >
              {pad}{label}%
            </span>
          );
        })}
      </div>
    </div>
  );
}
