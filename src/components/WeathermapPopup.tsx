import React from 'react';
import { GrafanaTheme2, PanelData } from '@grafana/data';
import { useStyles2 } from '@grafana/ui';
import { css } from '@emotion/css';
import { useViewport } from '@xyflow/react';

import { WeathermapOptions, NodeConfig, LinkConfig, HealthStatus, TimeSeries } from '../types';
import { usePopup } from '../context/PopupContext';
import { NodePopup } from './NodePopup';
import { LinkPopup } from './LinkPopup';
import { findHealthTimeSeries, findTrafficTimeSeries } from '../utils/matching';

interface WeathermapPopupProps {
  options: WeathermapOptions;
  data: PanelData;
}

function resolveNodeHealth(
  node: NodeConfig,
  options: WeathermapOptions,
  data: PanelData
): { status: HealthStatus | null | undefined; timeSeries: TimeSeries<HealthStatus> | null } {
  if (node.statusQueryId == null) {
    return { status: undefined, timeSeries: null };
  }
  const queries = options.queries ?? [];
  const qc = queries.find((q) => q.id === node.statusQueryId);
  if (!qc || qc.type !== 'nodeHealth') {
    return { status: null, timeSeries: null };
  }
  const timeSeries = findHealthTimeSeries(data, qc, node.name);
  return {
    status: timeSeries?.getLatestValue()?.value ?? null,
    timeSeries,
  };
}

function resolveLinkTraffic(
  link: LinkConfig,
  options: WeathermapOptions,
  data: PanelData,
  nodeMap: Map<number, NodeConfig>
): { atozTraffic: TimeSeries<number> | null; ztoaTraffic: TimeSeries<number> | null } {
  const queries = options.queries ?? [];
  const aNode = nodeMap.get(link.aNodeId);
  const zNode = nodeMap.get(link.zNodeId);

  let atozTraffic: TimeSeries<number> | null = null;
  let ztoaTraffic: TimeSeries<number> | null = null;

  if (aNode && zNode) {
    if (link.atozQueryId != null) {
      const qc = queries.find((q) => q.id === link.atozQueryId);
      if (qc && qc.type === 'linkTraffic') {
        const instance = link.atozReversed ? zNode.name : aNode.name;
        const iface = link.atozReversed ? link.zInterface : link.aInterface;
        atozTraffic = findTrafficTimeSeries(data, qc, instance, iface);
      }
    }

    if (link.ztoaQueryId != null) {
      const qc = queries.find((q) => q.id === link.ztoaQueryId);
      if (qc && qc.type === 'linkTraffic') {
        const instance = link.ztoaReversed ? aNode.name : zNode.name;
        const iface = link.ztoaReversed ? link.aInterface : link.zInterface;
        ztoaTraffic = findTrafficTimeSeries(data, qc, instance, iface);
      }
    }
  }

  return { atozTraffic, ztoaTraffic };
}

export const WeathermapPopup: React.FC<WeathermapPopupProps> = ({ options, data }) => {
  const { state } = usePopup();
  const styles = useStyles2(getStyles);

  const activeTarget = state.pinned ?? state.preview;

  const nodes = options.nodes ?? [];
  const links = options.links ?? [];
  const nodeMap = new Map<number, NodeConfig>(nodes.map((n) => [n.id, n]));

  // Resolve node or link data based on active target type
  const node = activeTarget?.type === 'node'
    ? nodes.find((n) => String(n.id) === activeTarget.id) ?? null
    : null;

  const link = activeTarget?.type === 'link'
    ? links.find((l) => String(l.id) === activeTarget.id) ?? null
    : null;

  const { status: healthStatus, timeSeries: healthTimeSeries } =
    node != null ? resolveNodeHealth(node, options, data) : { status: undefined, timeSeries: null };

  const { atozTraffic, ztoaTraffic } =
    link != null
      ? resolveLinkTraffic(link, options, data, nodeMap)
      : { atozTraffic: null, ztoaTraffic: null };

  const panelFrom = data.timeRange.from.valueOf();
  const panelTo = data.timeRange.to.valueOf();
  const maxDataPoints = data.request?.maxDataPoints ?? 1080;

  // Convert pinned flow (canvas) position to panel-relative coordinates using current viewport.
  // This makes the popup follow the element in real-time as the canvas is panned or zoomed.
  const { x: vpX, y: vpY, zoom } = useViewport();
  const anchorPos =
    state.pinned != null && state.pinnedFlowPos != null
      ? { x: state.pinnedFlowPos.x * zoom + vpX, y: state.pinnedFlowPos.y * zoom + vpY }
      : state.cursorPos;

  // Place popup above the anchor by default; flip below if too close to the top edge.
  const ESTIMATED_POPUP_HEIGHT = link != null ? 280 : 60;
  const GAP = 4;
  const translateY = anchorPos.y < ESTIMATED_POPUP_HEIGHT ? `${GAP}px` : `calc(-100% - ${GAP}px)`;

  if (node == null && link == null) {
    return null;
  }

  const aNode = link != null ? nodeMap.get(link.aNodeId) : undefined;
  const zNode = link != null ? nodeMap.get(link.zNodeId) : undefined;

  return (
    <div
      className={styles.popup}
      style={{
        left: anchorPos.x,
        top: anchorPos.y,
        transform: `translate(-50%, ${translateY})`,
      }}
    >
      {node != null && (
        <NodePopup
          node={node}
          healthStatus={healthStatus}
          healthTimeSeries={healthTimeSeries ?? undefined}
          panelFrom={panelFrom}
          panelTo={panelTo}
          maxDataPoints={maxDataPoints}
        />
      )}
      {link != null && aNode != null && zNode != null && (
        <LinkPopup
          link={link}
          aNode={aNode}
          zNode={zNode}
          atozTraffic={atozTraffic}
          ztoaTraffic={ztoaTraffic}
        />
      )}
    </div>
  );
};

const getStyles = (_theme: GrafanaTheme2) => ({
  popup: css({
    position: 'absolute',
    pointerEvents: 'none',
    zIndex: 100,
  }),
});
