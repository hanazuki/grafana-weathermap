import React from 'react';
import { GrafanaTheme2, FieldType, FieldSparkline, type Field } from '@grafana/data';
import { type GraphFieldConfig } from '@grafana/schema';
import { useTheme2, useStyles2, Sparkline } from '@grafana/ui';
import { css } from '@emotion/css';
import { LinkConfig, NodeConfig } from '../types';
import { TrafficStats } from '../utils/matching';
import { formatBps } from '../utils/format';

interface LinkPopupProps {
  link: LinkConfig;
  sourceNode: NodeConfig;
  targetNode: NodeConfig;
  outStats: TrafficStats | null; // A→Z (egress, source→target)
  inStats: TrafficStats | null;  // Z→A (ingress, target→source)
}

const CHART_LINE_OUT = '#fa4d56'; // A→Z line color
const CHART_LINE_IN = '#1192e8';  // Z→A line color

const POPUP_WIDTH = 220;
const CHART_PADDING_H = 12;
const CHART_WIDTH = POPUP_WIDTH - CHART_PADDING_H * 2;
const CHART_HEIGHT = 80;

const DASH = '—';

function fmtStat(value: number | null | undefined): string {
  if (value == null) {
    return DASH;
  }
  return formatBps(value);
}

/** Build a FieldSparkline for one traffic direction with a fixed line color and shared Y max. */
function makeSparkline(stats: TrafficStats, color: string, sharedMax: number, dashed = false): FieldSparkline {
  const custom: GraphFieldConfig = {
    lineColor: color,
    lineWidth: 1.5,
    fillOpacity: 0,
    lineStyle: dashed ? { fill: 'dot' } : { fill: 'solid' },
  };

  const yField: Field<number> = {
    ...stats.yField,
    config: {
      min: 0,
      max: sharedMax > 0 ? sharedMax : 1,
      custom,
    },
  };

  return {
    y: yField,
    x: stats.xField ?? undefined,
  };
}

export const LinkPopup: React.FC<LinkPopupProps> = ({
  link,
  sourceNode,
  targetNode,
  outStats,
  inStats,
}) => {
  const theme = useTheme2();
  const styles = useStyles2(getStyles);

  const srcName = sourceNode.name !== '' ? sourceNode.name : `#${sourceNode.id}`;
  const tgtName = targetNode.name !== '' ? targetNode.name : `#${targetNode.id}`;

  // Y-axis max is the link bandwidth; fall back to peak traffic if capacity is unset.
  const yMax = link.capacity > 0 ? link.capacity : Math.max(outStats?.peak ?? 0, inStats?.peak ?? 0);

  const outSparkline = outStats != null ? makeSparkline(outStats, CHART_LINE_OUT, yMax, false) : null;
  const inSparkline = inStats != null ? makeSparkline(inStats, CHART_LINE_IN, yMax, true) : null;

  // Build a flat-line placeholder field when one direction has no data.
  const emptyField: Field<number> = {
    name: '',
    type: FieldType.number,
    config: { min: 0, max: yMax > 0 ? yMax : 1 },
    values: [],
    labels: {},
    state: null,
  };
  const emptySparkline: FieldSparkline = { y: emptyField };

  const showChart = outSparkline != null || inSparkline != null;

  return (
    <div className={styles.popup}>
      {/* Header: source and target with interfaces */}
      <div className={styles.header}>
        <div className={styles.headerLine}>
          <span className={styles.endpointLabel}>A:</span>
          <span className={styles.endpointName}>{srcName}</span>
          <span className={styles.endpointValue}>[{link.sourceInterface}]</span>
        </div>
        <div className={styles.headerLine}>
          <span className={styles.endpointLabel}>Z:</span>
          <span className={styles.endpointName}>{tgtName}</span>
          <span className={styles.endpointValue}>[{link.targetInterface}]</span>
        </div>
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
              <td className={styles.td}>{fmtStat(outStats?.avg)}</td>
              <td className={styles.td}>{fmtStat(inStats?.avg)}</td>
            </tr>
            <tr>
              <th className={styles.tdLabel}>Peak:</th>
              <td className={styles.td}>{fmtStat(outStats?.peak)}</td>
              <td className={styles.td}>{fmtStat(inStats?.peak)}</td>
            </tr>
            <tr>
              <th className={styles.tdLabel}>Latest:</th>
              <td className={styles.td}>{fmtStat(outStats?.latest)}</td>
              <td className={styles.td}>{fmtStat(inStats?.latest)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Mini chart: two overlaid Sparklines on a shared Y-axis */}
      {showChart && (
        <div className={styles.chartWrapper}>
          <div className={styles.bandwidth}>Bandwidth: {link.capacity > 0 ? formatBps(link.capacity) : DASH}</div>
          <div className={styles.chartInner}>
            {/* Egress (A→Z) sparkline */}
            <Sparkline
              theme={theme}
              width={CHART_WIDTH}
              height={CHART_HEIGHT}
              sparkline={outSparkline ?? emptySparkline}
            />
            {/* Ingress (Z→A) sparkline overlaid */}
            <div className={styles.sparklineOverlay}>
              <Sparkline
                theme={theme}
                width={CHART_WIDTH}
                height={CHART_HEIGHT}
                sparkline={inSparkline ?? emptySparkline}
              />
            </div>
            {/* Axis lines */}
            <svg
              width={CHART_WIDTH}
              height={CHART_HEIGHT}
              className={styles.svgOverlay}
            >
              {/* Y-axis */}
              <line x1={0.5} y1={0.5} x2={5.5} y2={0.5} stroke={theme.colors.text.primary} strokeWidth={1} />
              <line x1={0.5} y1={0.5} x2={0.5} y2={CHART_HEIGHT - 0.5} stroke={theme.colors.text.primary} strokeWidth={1} />
              {/* X-axis */}
              <line x1={0.5} y1={CHART_HEIGHT - 0.5} x2={CHART_WIDTH} y2={CHART_HEIGHT - 0.5} stroke={theme.colors.text.primary} strokeWidth={1} />
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
    background: CHART_LINE_OUT,
    flexShrink: 0,
  }),
  swatchIn: css({
    width: 16,
    height: 2,
    background: `repeating-linear-gradient(to right, ${CHART_LINE_IN} 0, ${CHART_LINE_IN} 6px, transparent 6px, transparent 10px)`,
    flexShrink: 0,
  }),
});
