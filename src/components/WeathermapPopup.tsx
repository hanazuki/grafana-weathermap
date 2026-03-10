import React from 'react';
import { PanelData } from '@grafana/data';
import { useViewport } from '@xyflow/react';

import { WeathermapOptions, NodeConfig, HealthStatus } from '../types';
import { usePopup } from '../context/PopupContext';
import { NodePopup } from './NodePopup';
import { findHealthSeries, findHealthTimeSeries, HealthTimeSeries } from '../utils/matching';

interface WeathermapPopupProps {
  options: WeathermapOptions;
  data: PanelData;
}

function resolveNodeHealth(
  node: NodeConfig,
  options: WeathermapOptions,
  data: PanelData
): { status: HealthStatus; timeSeries: HealthTimeSeries | null } {
  if (node.statusQueryId == null) {
    return { status: null, timeSeries: null };
  }
  const queries = options.queries ?? [];
  const qc = queries.find((q) => q.id === node.statusQueryId);
  if (!qc || qc.type !== 'nodeHealth') {
    return { status: 'unavailable', timeSeries: null };
  }
  return {
    status: findHealthSeries(data, qc, node.name),
    timeSeries: findHealthTimeSeries(data, qc, node.name),
  };
}

export const WeathermapPopup: React.FC<WeathermapPopupProps> = ({ options, data }) => {
  const { state } = usePopup();

  const activeTarget = state.pinned ?? state.preview;
  const isNodeTarget = activeTarget !== null && activeTarget.type === 'node';

  const node = isNodeTarget
    ? (options.nodes ?? []).find((n) => String(n.id) === activeTarget.id) ?? null
    : null;

  const { status: healthStatus, timeSeries: healthTimeSeries } =
    node != null ? resolveNodeHealth(node, options, data) : { status: null as HealthStatus, timeSeries: null };

  const panelFrom = data.timeRange.from.valueOf();
  const panelTo = data.timeRange.to.valueOf();
  const maxDataPoints = data.request?.maxDataPoints ?? 1080;

  // Convert pinned flow (canvas) position to panel-relative coordinates using current viewport.
  // This makes the popup follow the node in real-time as the canvas is panned or zoomed.
  const { x: vpX, y: vpY, zoom } = useViewport();
  const anchorPos =
    state.pinned != null && state.pinnedFlowPos != null
      ? { x: state.pinnedFlowPos.x * zoom + vpX, y: state.pinnedFlowPos.y * zoom + vpY }
      : state.cursorPos;

  // Place popup above the anchor by default; flip below if too close to the top edge.
  const ESTIMATED_POPUP_HEIGHT = 60;
  const GAP = 4;
  const translateY = anchorPos.y < ESTIMATED_POPUP_HEIGHT ? `${GAP}px` : `calc(-100% - ${GAP}px)`;

  if (node == null) {
    return null;
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: anchorPos.x,
        top: anchorPos.y,
        transform: `translate(-50%, ${translateY})`,
        pointerEvents: 'none',
        zIndex: 100,
      }}
    >
      <NodePopup
        node={node}
        healthStatus={healthStatus}
        healthTimeSeries={healthTimeSeries ?? undefined}
        panelFrom={panelFrom}
        panelTo={panelTo}
        maxDataPoints={maxDataPoints}
      />
    </div>
  );
};
