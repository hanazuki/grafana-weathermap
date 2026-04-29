import { css } from '@emotion/css';
import type { GrafanaTheme2, PanelData } from '@grafana/data';
import { Portal, VizTooltipContainer, useStyles2 } from '@grafana/ui';
import { useViewport } from '@xyflow/react';
import type React from 'react';
import { useEffect } from 'react';
import { usePopup } from '../context/PopupContext';
import type { HealthStatus, LinkConfig, NodeConfig, TimeSeries, WeathermapOptions } from '../types';
import { findHealthTimeSeries, findTrafficTimeSeries } from '../utils/matching';
import { LinkPopup } from './LinkPopup';
import { NodePopup } from './NodePopup';

const OFFSET = { x: 8, y: 8 };

interface WeathermapPopupProps {
  panelRef: React.RefObject<HTMLDivElement>;
  options: WeathermapOptions;
  data: PanelData;
}

function resolveNodeHealth(
  node: NodeConfig,
  options: WeathermapOptions,
  data: PanelData,
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
  nodeMap: Map<number, NodeConfig>,
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
        atozTraffic = findTrafficTimeSeries({
          data,
          queryConfig: qc,
          srcNode: { name: aNode.name, iface: link.aInterface },
          dstNode: { name: zNode.name, iface: link.zInterface },
        });
      }
    }

    if (link.ztoaQueryId != null) {
      const qc = queries.find((q) => q.id === link.ztoaQueryId);
      if (qc && qc.type === 'linkTraffic') {
        ztoaTraffic = findTrafficTimeSeries({
          data,
          queryConfig: qc,
          srcNode: { name: zNode.name, iface: link.zInterface },
          dstNode: { name: aNode.name, iface: link.aInterface },
        });
      }
    }
  }

  return { atozTraffic, ztoaTraffic };
}

export const WeathermapPopup: React.FC<WeathermapPopupProps> = ({ panelRef, options, data }) => {
  const { state, setPinned } = usePopup();
  const styles = useStyles2(getStyles, state.pinned != null);

  useEffect(() => {
    if (state.pinned == null) {
      return;
    }
    const handler = () => setPinned(null);
    window.addEventListener('scroll', handler, { capture: true, passive: true });
    return () => window.removeEventListener('scroll', handler, { capture: true });
  }, [state.pinned, setPinned]);

  const activeTarget = state.pinned ?? state.preview;

  const nodes = options.nodes ?? [];
  const links = options.links ?? [];
  const nodeMap = new Map<number, NodeConfig>(nodes.map((n) => [n.id, n]));

  // Resolve node or link data based on active target type
  const node = activeTarget?.type === 'node' ? (nodes.find((n) => String(n.id) === activeTarget.id) ?? null) : null;

  const link = activeTarget?.type === 'link' ? (links.find((l) => String(l.id) === activeTarget.id) ?? null) : null;

  const { status: healthStatus, timeSeries: healthTimeSeries } =
    node != null ? resolveNodeHealth(node, options, data) : { status: undefined, timeSeries: null };

  const { atozTraffic, ztoaTraffic } =
    link != null ? resolveLinkTraffic(link, options, data, nodeMap) : { atozTraffic: null, ztoaTraffic: null };

  const panelFrom = data.timeRange.from.valueOf();
  const panelTo = data.timeRange.to.valueOf();
  const maxDataPoints = data.request?.maxDataPoints ?? 1080;

  // Convert pinned flow (canvas) position to client coordinates using current viewport.
  // cursorPos is already in client coordinates; pinnedFlowPos needs the panel offset added.
  const { x: vpX, y: vpY, zoom } = useViewport();
  const panelRect = panelRef.current?.getBoundingClientRect();
  const anchorPos =
    state.pinned != null && state.pinnedFlowPos != null && panelRect != null
      ? {
          x: state.pinnedFlowPos.x * zoom + vpX + panelRect.left,
          y: state.pinnedFlowPos.y * zoom + vpY + panelRect.top,
        }
      : state.cursorPos;

  if (node == null && link == null) {
    return null;
  }

  const aNode = link != null ? nodeMap.get(link.aNodeId) : undefined;
  const zNode = link != null ? nodeMap.get(link.zNodeId) : undefined;

  return (
    <Portal>
      <VizTooltipContainer
        position={anchorPos}
        offset={OFFSET}
        className={styles.container}
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
          <LinkPopup link={link} aNode={aNode} zNode={zNode} atozTraffic={atozTraffic} ztoaTraffic={ztoaTraffic} />
        )}
      </VizTooltipContainer>
    </Portal>
  );
};

const getStyles = (theme: GrafanaTheme2, isPinned: boolean) => ({
  container: css({
    padding: '0 !important',
    boxShadow: `${isPinned ? theme.shadows.z3 : theme.shadows.z2} !important`,
  }),
});
