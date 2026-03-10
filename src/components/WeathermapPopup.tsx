import React, { useState } from 'react';
import { PanelData } from '@grafana/data';
import { Popover } from '@grafana/ui';

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
  const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null);

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

  // Pinned popup stays at the position it was opened; preview follows the cursor.
  const anchorPos = state.pinned != null ? (state.pinnedPos ?? state.cursorPos) : state.cursorPos;

  // Show popup above cursor by default; flip below if too close to the top edge.
  // Use a rough estimate of popup height to determine flip.
  const ESTIMATED_POPUP_HEIGHT = 60;
  const placement = anchorPos.y < ESTIMATED_POPUP_HEIGHT ? 'bottom' : 'top';

  const show = node != null;

  return (
    <>
      {/* Virtual anchor: a 1×1 px invisible div repositioned to cursor coordinates */}
      <div
        ref={setAnchorEl}
        style={{
          position: 'absolute',
          left: anchorPos.x,
          top: anchorPos.y,
          width: 1,
          height: 1,
          pointerEvents: 'none',
        }}
      />
      {anchorEl != null && node != null && (
        <Popover
          referenceElement={anchorEl}
          show={show}
          placement={placement}
          renderArrow={false}
          content={
            <NodePopup
              node={node}
              healthStatus={healthStatus}
              healthTimeSeries={healthTimeSeries ?? undefined}
              panelFrom={panelFrom}
              panelTo={panelTo}
              maxDataPoints={maxDataPoints}
            />
          }
        />
      )}
    </>
  );
};
