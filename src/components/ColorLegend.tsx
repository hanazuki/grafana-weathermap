import React, { useId } from 'react';
import { GrafanaTheme2 } from '@grafana/data';
import { useStyles2 } from '@grafana/ui';
import { css } from '@emotion/css';

import { ColorScale } from '../utils/color';

interface ColorLegendProps {
  colorScale: ColorScale;
  colorScaleMode: 'linear' | 'log';
  logScaleBase: number;
}

/** Return the utilization % at which color step i begins (i = 0..10). */
function stepStartPct(i: number, mode: 'linear' | 'log', logScaleBase: number): number {
  if (mode === 'linear') {
    return i * 10;
  }
  // Inverse of: t = log_b(util × (b−1) + 1) at t = i/10
  // util = (b^(i/10) − 1) / (b−1), expressed as a percentage
  const b = logScaleBase;
  return (Math.pow(b, i / 10) - 1) * 100 / (b - 1);
}

const BAR_HEIGHT = 160;
const BAR_WIDTH = 16;

export function ColorLegend({ colorScale, colorScaleMode, logScaleBase }: ColorLegendProps) {
  const styles = useStyles2(getStyles);

  const stops = Array.from({ length: 11 }, (_, i) => ({
    color: colorScale(i / 10),
    pct: stepStartPct(i, colorScaleMode, logScaleBase),
  }));

  const gradient = `linear-gradient(in oklch shorter hue to bottom, ${stops.map(({ color, pct }) => `${color} ${pct.toFixed(2)}%`).join(', ')})`;

  const titleId = useId();

  return (
    <div
      className={styles.container}
      role="figure"
      aria-label="Legend"
    >
      <div
        className={styles.axisLabel}
        id={titleId}
      >
        <span className={styles.axisLabelText}>
          Utilization (%)
        </span>
      </div>
      <div
        className={styles.colorBar}
        style={{ background: gradient }}
        role="img"
        aria-labelledby={titleId}
      />
      <div className={styles.tickList} role="list">
        {stops.map(({ pct }, i) => {
          const label = String(Math.round(pct));
          const pad = '\u2007'.repeat(Math.max(0, 3 - label.length));
          return (
            <span
              key={i}
              className={styles.tick}
              style={{ top: `${(pct / 100) * BAR_HEIGHT}px` }}
              role="listitem"
            >
              <span aria-hidden>{pad}</span>{label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  container: css({
    position: 'absolute',
    top: theme.spacing(1),
    left: theme.spacing(1),
    zIndex: 5,
    display: 'flex',
    alignItems: 'flex-start',
    pointerEvents: 'none',
    gap: theme.spacing(0.5),
  }),
  axisLabel: css({
    position: 'relative',
    width: theme.typography.bodySmall.fontSize,
    height: BAR_HEIGHT,
    flexShrink: 0,
  }),
  axisLabelText: css({
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%) rotate(-90deg)',
    whiteSpace: 'nowrap',
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.text.secondary,
    lineHeight: 1,
  }),
  colorBar: css({
    width: BAR_WIDTH,
    height: BAR_HEIGHT,
    backgroundOrigin: 'border-box',
    border: `1px solid ${theme.colors.border.medium}`,
    flexShrink: 0,
  }),
  tickList: css({
    height: BAR_HEIGHT,
    position: 'relative',
  }),
  tick: css({
    position: 'absolute',
    transform: 'translateY(-50%)',
    fontSize: theme.typography.bodySmall.fontSize,
    fontVariantNumeric: 'tabular-nums',
    color: theme.colors.text.secondary,
    lineHeight: 1,
    whiteSpace: 'pre',
  }),
});
