import React from 'react';
import { useTheme2 } from '@grafana/ui';
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

const DASH = '—';

function fmtStat(value: number | null | undefined): string {
  if (value == null) {
    return DASH;
  }
  return formatBps(value);
}

export const LinkPopup: React.FC<LinkPopupProps> = ({ link, sourceNode, targetNode, outStats, inStats }) => {
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

  return (
    <div
      style={{
        width: 220,
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
        <div style={bandwidthStyle}>Bandwidth: {link.capacity > 0 ? formatBps(link.capacity) : DASH}</div>
      </div>
    </div>
  );
};
