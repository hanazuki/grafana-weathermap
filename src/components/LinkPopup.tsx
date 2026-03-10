import React from 'react';
import { FieldType, FieldSparkline, type Field } from '@grafana/data';
import { type GraphFieldConfig } from '@grafana/schema';
import { useTheme2, Sparkline } from '@grafana/ui';
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
    lineStyle: dashed ? { fill: 'dash', dash: [20, 10] } : { fill: 'solid' },
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

  const srcName = sourceNode.name !== '' ? sourceNode.name : `#${sourceNode.id}`;
  const tgtName = targetNode.name !== '' ? targetNode.name : `#${targetNode.id}`;

  const headerStyle: React.CSSProperties = {
    padding: '8px 12px',
    borderBottom: `1px solid ${theme.colors.border.weak}`,
  };

  const headerLineStyle: React.CSSProperties = {
    display: 'flex',
    gap: 4,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
  };

  const labelStyle: React.CSSProperties = {
    color: theme.colors.text.secondary,
    flexShrink: 0,
  };

  const valueStyle: React.CSSProperties = {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  const endpointNameStyle: React.CSSProperties = {
    fontWeight: 'bold',
  };

  const bodyStyle: React.CSSProperties = {
    padding: '8px 12px',
  };

  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
  };

  const thStyle: React.CSSProperties = {
    color: theme.colors.text.secondary,
    fontWeight: 'normal',
    textAlign: 'center',
  };

  const tdStyle: React.CSSProperties = {
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums',
  };

  const tdLabelStyle: React.CSSProperties = {
    color: theme.colors.text.secondary,
    textAlign: 'left',
  };

  const bandwidthStyle: React.CSSProperties = {
    marginTop: 6,
    color: theme.colors.text.secondary,
  };

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
    <div
      style={{
        width: POPUP_WIDTH,
        fontSize: theme.typography.bodySmall.fontSize,
        color: theme.colors.text.primary,
        background: theme.colors.background.secondary,
        border: `1px solid ${theme.colors.border.medium}`,
        borderRadius: theme.shape.radius.default,
        overflow: 'hidden',
      }}
    >
      {/* Header: source and target with interfaces */}
      <div style={headerStyle}>
        <div style={headerLineStyle}>
          <span style={labelStyle}>A:</span>
          <span style={endpointNameStyle}>{srcName}</span>
          <span style={valueStyle}>[{link.sourceInterface}]</span>
        </div>
        <div style={headerLineStyle}>
          <span style={labelStyle}>Z:</span>
          <span style={endpointNameStyle}>{tgtName}</span>
          <span style={valueStyle}>[{link.targetInterface}]</span>
        </div>
      </div>

      {/* Traffic values */}
      <div style={bodyStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th />
              <th style={thStyle}>A → Z</th>
              <th style={thStyle}>Z → A</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th style={tdLabelStyle}>Avg:</th>
              <td style={tdStyle}>{fmtStat(outStats?.avg)}</td>
              <td style={tdStyle}>{fmtStat(inStats?.avg)}</td>
            </tr>
            <tr>
              <th style={tdLabelStyle}>Peak:</th>
              <td style={tdStyle}>{fmtStat(outStats?.peak)}</td>
              <td style={tdStyle}>{fmtStat(inStats?.peak)}</td>
            </tr>
            <tr>
              <th style={tdLabelStyle}>Latest:</th>
              <td style={tdStyle}>{fmtStat(outStats?.latest)}</td>
              <td style={tdStyle}>{fmtStat(inStats?.latest)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Mini chart: two overlaid Sparklines on a shared Y-axis */}
      {showChart && (
        <div style={{ padding: `0 ${CHART_PADDING_H}px 8px` }}>
          <div style={bandwidthStyle}>Bandwidth: {link.capacity > 0 ? formatBps(link.capacity) : DASH}</div>
          <div style={{ position: 'relative', height: CHART_HEIGHT }}>
            {/* Egress (A→Z) sparkline */}
            <Sparkline
              theme={theme}
              width={CHART_WIDTH}
              height={CHART_HEIGHT}
              sparkline={outSparkline ?? emptySparkline}
            />
            {/* Ingress (Z→A) sparkline overlaid */}
            <div style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
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
              style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
            >
              {/* Y-axis */}
              <line x1={0.5} y1={0.5} x2={5.5} y2={0.5} stroke={theme.colors.text.primary} strokeWidth={1} />
              <line x1={0.5} y1={0.5} x2={0.5} y2={CHART_HEIGHT - 0.5} stroke={theme.colors.text.primary} strokeWidth={1} />
              {/* X-axis */}
              <line x1={0.5} y1={CHART_HEIGHT - 0.5} x2={CHART_WIDTH} y2={CHART_HEIGHT - 0.5} stroke={theme.colors.text.primary} strokeWidth={1} />
            </svg>
          </div>

          {/* Chart legend */}
          <div
            style={{
              display: 'flex',
              gap: 12,
              marginTop: 4,
              fontSize: theme.typography.bodySmall.fontSize,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 16, height: 2, background: CHART_LINE_OUT, flexShrink: 0 }} role="img" />
              <span>A → Z</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 16, height: 2, background: `repeating-linear-gradient(to right, ${CHART_LINE_IN} 0, ${CHART_LINE_IN} 6px, transparent 6px, transparent 10px)`, flexShrink: 0 }} role="img" />
              <span>Z → A</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
