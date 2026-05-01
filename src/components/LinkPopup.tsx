import { css } from '@emotion/css';
import { type Field, type FieldSparkline, FieldType, type GrafanaTheme2 } from '@grafana/data';
import type { GraphFieldConfig } from '@grafana/schema';
import { Sparkline, useStyles2, useTheme2 } from '@grafana/ui';
import type React from 'react';
import type { LinkConfig, NodeConfig, TimeSeries } from '../types';
import { formatBps } from '../utils/format';

const CHART_LINE_AZ = '#fa4d56';
const CHART_LINE_ZA = '#1192e8';

const POPUP_WIDTH = 220;
const CHART_PADDING_H = 12;
const CHART_WIDTH = POPUP_WIDTH - CHART_PADDING_H * 2;
const CHART_HEIGHT = 80;

const DASH = '—';

/** Round value up to the nearest 1, 2, or 5 * 10^n. Returns 1 for non-positive input. */
function niceMax(value: number): number {
  if (value <= 0) {
    return 1;
  }
  const base = 10 ** Math.floor(Math.log10(value));
  const frac = value / base;
  if (frac <= 1) {
    return base;
  }
  if (frac <= 2) {
    return 2 * base;
  }
  if (frac <= 5) {
    return 5 * base;
  }
  return 10 * base;
}

function fmtStat(value: number | null | undefined): string {
  if (value == null) {
    return DASH;
  }
  return formatBps(value);
}

function computeStats(values: number[]): { avg: number; peak: number; latest: number } | null {
  let sum = 0,
    peak = -Infinity,
    count = 0,
    latest = 0;
  for (const v of values) {
    if (Number.isFinite(v)) {
      sum += v;
      if (v > peak) {
        peak = v;
      }
      latest = v;
      count++;
    }
  }
  return count > 0 ? { avg: sum / count, peak, latest } : null;
}

/** Build a FieldSparkline for one traffic direction with a fixed line color and shared Y max. */
function makeSparkline(
  { values, timestamps }: { values: number[]; timestamps: number[] },
  color: string,
  axisMax: number,
  dashed = false,
): FieldSparkline {
  const custom: GraphFieldConfig = {
    lineColor: color,
    lineWidth: 1.5,
    fillOpacity: 0,
    lineStyle: dashed ? { fill: 'dot' } : { fill: 'solid' },
  };

  const y: Field<number> = {
    name: 'traffic',
    type: FieldType.number,
    config: { min: 0, max: axisMax, custom },
    values,
    labels: {},
    state: { range: { min: 0, max: axisMax, delta: axisMax } },
  };

  const x: Field<number> = {
    name: 'time',
    type: FieldType.time,
    config: {},
    values: timestamps,
    labels: {},
  };

  return { y, x };
}

interface LinkChartProps {
  atozValues: { values: number[]; timestamps: number[] } | null;
  ztoaValues: { values: number[]; timestamps: number[] } | null;
  yMax: number;
}

const LinkChart: React.FC<LinkChartProps> = ({ atozValues, ztoaValues, yMax }) => {
  const theme = useTheme2();
  const styles = useStyles2(getStyles);

  const axisMax = niceMax(yMax);

  const emptySparkline: FieldSparkline = {
    y: {
      name: '',
      type: FieldType.number,
      config: { min: 0, max: axisMax },
      values: [],
      labels: {},
      state: null,
    },
  };

  const outSparkline = atozValues != null ? makeSparkline(atozValues, CHART_LINE_AZ, axisMax, false) : emptySparkline;
  const inSparkline = ztoaValues != null ? makeSparkline(ztoaValues, CHART_LINE_ZA, axisMax, true) : emptySparkline;

  return (
    <div className={styles.chartWrapper}>
      <div className={styles.chartInner}>
        <Sparkline theme={theme} width={CHART_WIDTH} height={CHART_HEIGHT} sparkline={outSparkline} />
        <div className={styles.sparklineOverlay}>
          <Sparkline theme={theme} width={CHART_WIDTH} height={CHART_HEIGHT} sparkline={inSparkline} />
        </div>
        {/* Axis lines */}
        <svg width={CHART_WIDTH} height={CHART_HEIGHT} className={styles.svgOverlay}>
          <title>Chart axes</title>
          {/* Y-axis */}
          <line x1={0.5} y1={0.5} x2={5.5} y2={0.5} stroke={theme.colors.text.primary} strokeWidth={1} />
          <line x1={0.5} y1={0.5} x2={0.5} y2={CHART_HEIGHT - 0.5} stroke={theme.colors.text.primary} strokeWidth={1} />
          <line
            x1={0.5}
            y1={CHART_HEIGHT / 2}
            x2={3.5}
            y2={CHART_HEIGHT / 2}
            stroke={theme.colors.text.primary}
            strokeWidth={1}
          />
          <text x={8} y={0} className={styles.axisLabel} dominantBaseline="hanging">
            {formatBps(axisMax)}
          </text>
          <text x={8} y={CHART_HEIGHT / 2} className={styles.axisLabel} dominantBaseline="middle">
            {formatBps(axisMax / 2)}
          </text>
          {/* X-axis */}
          <line
            x1={0.5}
            y1={CHART_HEIGHT - 0.5}
            x2={CHART_WIDTH}
            y2={CHART_HEIGHT - 0.5}
            stroke={theme.colors.text.primary}
            strokeWidth={1}
          />
        </svg>
      </div>

      {/* Chart legend */}
      <div className={styles.legendRow}>
        <div className={styles.legendItem}>
          <div className={styles.swatchOut} role="img" />
          <span>A → Z</span>
        </div>
        <div className={styles.legendItem}>
          <div className={styles.swatchIn} role="img" />
          <span>Z → A</span>
        </div>
      </div>
    </div>
  );
};

interface LinkPopupProps {
  link: LinkConfig;
  aNode: NodeConfig;
  zNode: NodeConfig;
  atozTraffic: TimeSeries<number> | null;
  ztoaTraffic: TimeSeries<number> | null;
}

export const LinkPopup: React.FC<LinkPopupProps> = ({ link, aNode, zNode, atozTraffic, ztoaTraffic }) => {
  const styles = useStyles2(getStyles);

  const aName = aNode.name !== '' ? aNode.name : `#${aNode.id}`;
  const zName = zNode.name !== '' ? zNode.name : `#${zNode.id}`;

  const atozValues = atozTraffic?.getValues() ?? null;
  const ztoaValues = ztoaTraffic?.getValues() ?? null;
  const atozStats = atozValues != null ? computeStats(atozValues.values) : null;
  const ztoaStats = ztoaValues != null ? computeStats(ztoaValues.values) : null;

  const showChart = atozValues != null || ztoaValues != null;

  return (
    <div className={styles.popup} data-testid="iwm-link-popup">
      <div className={styles.header}>
        <div className={styles.headerLine}>
          <span className={styles.endpointLabel}>A:</span>
          <span className={styles.endpointName}>{aName}</span>
          {link.aInterface !== '' && <span className={styles.endpointValue}>[{link.aInterface}]</span>}
        </div>
        <div className={styles.headerLine}>
          <span className={styles.endpointLabel}>Z:</span>
          <span className={styles.endpointName}>{zName}</span>
          {link.zInterface !== '' && <span className={styles.endpointValue}>[{link.zInterface}]</span>}
        </div>
        {link.description !== undefined && <div className={styles.description}>{link.description}</div>}
      </div>

      {/* Traffic values */}
      <div className={styles.body}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th />
              <th className={styles.th}>A → Z</th>
              <th className={styles.th}>Z → A</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th className={styles.tdLabel}>Avg:</th>
              <td className={styles.td}>{fmtStat(atozStats?.avg)}</td>
              <td className={styles.td}>{fmtStat(ztoaStats?.avg)}</td>
            </tr>
            <tr>
              <th className={styles.tdLabel}>Peak:</th>
              <td className={styles.td}>{fmtStat(atozStats?.peak)}</td>
              <td className={styles.td}>{fmtStat(ztoaStats?.peak)}</td>
            </tr>
            <tr>
              <th className={styles.tdLabel}>Latest:</th>
              <td className={styles.td}>{fmtStat(atozStats?.latest)}</td>
              <td className={styles.td}>{fmtStat(ztoaStats?.latest)}</td>
            </tr>
          </tbody>
        </table>

        <div className={styles.bandwidth}>Bandwidth: {link.capacity > 0 ? formatBps(link.capacity) : DASH}</div>
      </div>

      {showChart && (
        <LinkChart
          atozValues={atozValues}
          ztoaValues={ztoaValues}
          yMax={Math.max(atozStats?.peak ?? 0, ztoaStats?.peak ?? 0)}
        />
      )}
    </div>
  );
};

const getStyles = (theme: GrafanaTheme2) => ({
  popup: css({
    width: POPUP_WIDTH,
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.text.primary,
    background: theme.colors.background.secondary,
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: theme.shape.radius.default,
    overflow: 'hidden',
  }),
  header: css({
    padding: theme.spacing(1, 1.5),
    borderBottom: `1px solid ${theme.colors.border.weak}`,
  }),
  description: css({ fontStyle: 'italic' }),
  headerLine: css({
    display: 'flex',
    gap: theme.spacing(0.5),
    overflow: 'hidden',
    whiteSpace: 'nowrap',
  }),
  endpointLabel: css({
    color: theme.colors.text.secondary,
    flexShrink: 0,
  }),
  endpointValue: css({
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }),
  endpointName: css({
    fontWeight: 'bold',
  }),
  body: css({
    padding: theme.spacing(1, 1.5),
  }),
  table: css({
    width: '100%',
    borderCollapse: 'collapse',
  }),
  th: css({
    color: theme.colors.text.secondary,
    fontWeight: 'normal',
    textAlign: 'center',
  }),
  td: css({
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums',
  }),
  tdLabel: css({
    color: theme.colors.text.secondary,
    textAlign: 'left',
  }),
  bandwidth: css({
    marginTop: theme.spacing(0.75),
    color: theme.colors.text.secondary,
    fontVariantNumeric: 'tabular-nums',
  }),
  chartWrapper: css({
    padding: `0 ${CHART_PADDING_H}px ${theme.spacing(1)}`,
  }),
  chartInner: css({
    position: 'relative',
    height: CHART_HEIGHT,
  }),
  sparklineOverlay: css({
    position: 'absolute',
    top: 0,
    left: 0,
    pointerEvents: 'none',
  }),
  svgOverlay: css({
    position: 'absolute',
    top: 0,
    left: 0,
    pointerEvents: 'none',
  }),
  axisLabel: css({
    fill: theme.colors.text.primary,
    fontSize: theme.typography.bodySmall.fontSize,
    fontVariantNumeric: 'tabular-nums',
  }),
  legendRow: css({
    display: 'flex',
    gap: theme.spacing(1.5),
    marginTop: theme.spacing(0.5),
    fontSize: theme.typography.bodySmall.fontSize,
  }),
  legendItem: css({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
  }),
  swatchOut: css({
    width: 16,
    height: 2,
    background: CHART_LINE_AZ,
    flexShrink: 0,
  }),
  swatchIn: css({
    width: 16,
    height: 2,
    background: `repeating-linear-gradient(to right, ${CHART_LINE_ZA} 0, ${CHART_LINE_ZA} 6px, transparent 6px, transparent 10px)`,
    flexShrink: 0,
  }),
});
