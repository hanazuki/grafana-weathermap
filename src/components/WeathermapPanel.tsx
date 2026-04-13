import React, { useCallback, useMemo, useRef } from 'react';
import { GrafanaTheme2, PanelProps } from '@grafana/data';
import { useTheme2, useStyles2, Icon } from '@grafana/ui';
import { css } from '@emotion/css';
import { ReactFlow, ReactFlowProvider, Background, Controls, ControlButton, useViewport, type Node, type Edge, type NodeChange, type Viewport, type Connection } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { WeathermapOptions, NodeConfig, QueryConfig, LinkConfig, HealthStatus } from '../types';
import { WeathermapNode, type WeathermapNodeData } from './WeathermapNode';
import { ConnectionLine } from './ConnectionLine';
import { WeathermapEdge, type WeathermapEdgeData } from './WeathermapEdge';
import { ColorLegend } from './ColorLegend';
import { CanvasContextMenu } from './CanvasContextMenu';
import { WeathermapPopup } from './WeathermapPopup';
import { InlineEditor } from './InlineEditor';
import { PopupProvider, usePopup } from '../context/PopupContext';
import { findTrafficTimeSeries, findHealthTimeSeries } from '../utils/matching';
import { getUtilizationColor, GRAY_COLOR, colorScales } from '../utils/color';
import { formatSI } from '../utils/format';
import { useIsEditing } from 'hooks/useIsEditing';
import { useLocalStorage } from 'hooks/useLocalStorage';
import * as z from 'zod/v4/mini';

// Total width of the color legend area (measured from ColorLegend.tsx):
// 8 px left offset + 12 px axis-label div + 4 px gap + 16 px bar + 4 px gap + ~28 px tick-label text
const COLOR_LEGEND_TOTAL_WIDTH = 72;

const NODE_TYPES = { weathermapNode: WeathermapNode };
const EDGE_TYPES = { weathermapEdge: WeathermapEdge };

function getLinkOffset(index: number): number {
  if (index === 0) {
    return 0;
  }
  return Math.ceil(index / 2) * (index % 2 === 1 ? 1 : -1);
}

export const WeathermapPanel: React.FC<PanelProps<WeathermapOptions>> = (props) => (
  <PopupProvider>
    <ReactFlowProvider>
      <WeathermapPanelContent {...props} />
    </ReactFlowProvider>
  </PopupProvider>
);

const PreferredColorSchemeIndex = z._default(z.number(), 0);

const WeathermapPanelContent: React.FC<PanelProps<WeathermapOptions>> = ({ options, data, width, height, onOptionsChange }) => {
  const theme = useTheme2();
  const styles = useStyles2(getStyles);
  const isEditing = useIsEditing();
  const [colorSchemeIndex, setColorSchemeIndex] = useLocalStorage('iwm-preferences-color-scheme', PreferredColorSchemeIndex);
  const colorScale = (colorScales[colorSchemeIndex] ?? colorScales[0]).getColor;
  const colorSchemeName = (colorScales[colorSchemeIndex] ?? colorScales[0]).name;
  const { state, setContextMenu, setPinned, setPreview, setCursorPos, setInlineEdit } = usePopup();
  const { x: vpX, y: vpY, zoom } = useViewport();
  const panelRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const moveStartViewport = useRef<Viewport | null>(null);

  const nodes = useMemo(() => options.nodes ?? [], [options.nodes]);
  const links = useMemo(() => options.links ?? [], [options.links]);
  const queries = useMemo(() => options.queries ?? [], [options.queries]);
  const nodeWidth = options.nodeWidth ?? 120;
  const nodeHeight = options.nodeHeight ?? 40;
  const linkStrokeWidth = options.linkStrokeWidth ?? 4;
  const linkTipLength = options.linkTipLength ?? 8;
  const linkLabelDistance = options.linkLabelDistance ?? 40;
  const linkParallelOffset = options.linkParallelOffset ?? 6;
  const linkLabelFontSize = options.linkLabelFontSize ?? 10;
  const logScaleBase = options.logScaleBase ?? 10;

  // Fast lookup maps
  const nodeMap = useMemo(() => new Map<number, NodeConfig>(nodes.map((n) => [n.id, n])), [nodes]);
  const queryMap = useMemo(
    () => new Map<number, QueryConfig>(queries.map((q) => [q.id, q])),
    [queries]
  );

  // Validate nodeLabelPattern / nodeLabelReplacement
  const labelTransformError = useMemo<string | null>(() => {
    const hasPattern = !!options.nodeLabelPattern;
    const hasReplacement = !!options.nodeLabelReplacement;
    if (hasPattern && !hasReplacement) {
      return 'nodeLabelPattern is set but nodeLabelReplacement is missing.';
    }
    if (!hasPattern && hasReplacement) {
      return 'nodeLabelReplacement is set but nodeLabelPattern is missing.';
    }
    if (hasPattern) {
      try {
        new RegExp(options.nodeLabelPattern!);
      } catch (e) {
        return `Invalid nodeLabelPattern: ${(e as Error).message}`;
      }
    }
    return null;
  }, [options.nodeLabelPattern, options.nodeLabelReplacement]);

  // Build label transform function (applied to node.name for canvas display only)
  const nodeLabelPattern = options.nodeLabelPattern;
  const nodeLabelReplacement = options.nodeLabelReplacement;
  const transformLabel = useCallback((name: string): string => {
    if (!nodeLabelPattern || !nodeLabelReplacement) {
      return name;
    }
    const regex = new RegExp(nodeLabelPattern);
    return name.replace(regex, nodeLabelReplacement);
  }, [nodeLabelPattern, nodeLabelReplacement]);

  // Determine which links have invalid query references
  const linksWithInvalidQuery = useMemo(() => {
    const bad = new Set<number>();
    for (const link of links) {
      if ((link.ztoaQueryId != null && !queryMap.has(link.ztoaQueryId)) ||
        (link.atozQueryId != null && !queryMap.has(link.atozQueryId))) {
        bad.add(link.id);
      }
    }
    return bad;
  }, [links, queryMap]);

  // Human-readable link label for warning banner
  const linkLabel = (link: (typeof links)[number]): string => {
    const aName = nodeMap.get(link.aNodeId)?.name ?? `#${link.aNodeId}`;
    const zName = nodeMap.get(link.zNodeId)?.name ?? `#${link.zNodeId}`;
    return `${aName} → ${zName} (#${link.id})`;
  };

  // Update cursor position (panel-relative) on mouse move
  const onPanelMouseMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!panelRef.current) {
        return;
      }
      const rect = panelRef.current.getBoundingClientRect();
      setCursorPos({ x: event.clientX - rect.left, y: event.clientY - rect.top });
    },
    [setCursorPos]
  );

  // Drag lifecycle: clear preview, context menu and pinned popup on drag start; block preview during drag
  const onNodeDragStart = useCallback(() => {
    isDragging.current = true;
    setPreview(null);
    setContextMenu(null);
    setPinned(null);
  }, [setPreview, setContextMenu, setPinned]);

  const onNodeDragStop = useCallback(() => {
    isDragging.current = false;
  }, []);

  // Node hover: set preview (mouse only, not when pinned, not while dragging)
  const onNodeMouseEnter = useCallback(
    (event: React.MouseEvent, rfNode: Node) => {
      if ((event.nativeEvent as PointerEvent).pointerType === 'touch') {
        return;
      }
      if (state.pinned || isDragging.current) {
        return;
      }
      setPreview({ type: 'node', id: rfNode.id });
    },
    [state.pinned, setPreview]
  );

  // Node leave: clear preview
  const onNodeMouseLeave = useCallback(() => {
    setPreview(null);
  }, [setPreview]);

  // Node click: toggle pinned, anchoring at the click position in flow coordinates
  const onNodeClick = useCallback(
    (event: React.MouseEvent, rfNode: Node) => {
      if (state.pinned?.type === 'node' && state.pinned.id === rfNode.id) {
        setPinned(null); // click same node → unpin
      } else {
        setPreview(null);
        // Convert click position from panel-relative to flow (canvas) coordinates.
        // The popup will open at the click point and follow the node during pan/zoom.
        let flowPos: { x: number; y: number };
        if (panelRef.current) {
          const rect = panelRef.current.getBoundingClientRect();
          const panelX = event.clientX - rect.left;
          const panelY = event.clientY - rect.top;
          flowPos = { x: (panelX - vpX) / zoom, y: (panelY - vpY) / zoom };
        } else {
          // Fallback (should not occur in practice): use node center
          flowPos = { x: rfNode.position.x + nodeWidth / 2, y: rfNode.position.y + nodeHeight / 2 };
        }
        setPinned({ type: 'node', id: rfNode.id }, flowPos);
      }
    },
    [state.pinned, setPinned, setPreview, vpX, vpY, zoom, nodeWidth, nodeHeight]
  );

  // Edge hover: set preview (mouse only, not when pinned)
  const onEdgeMouseEnter = useCallback(
    (event: React.MouseEvent, rfEdge: Edge) => {
      if ((event.nativeEvent as PointerEvent).pointerType === 'touch') {
        return;
      }
      if (state.pinned) {
        return;
      }
      setPreview({ type: 'link', id: rfEdge.id });
    },
    [state.pinned, setPreview]
  );

  // Edge leave: clear preview
  const onEdgeMouseLeave = useCallback(() => {
    setPreview(null);
  }, [setPreview]);

  // Edge click: toggle pinned, anchoring at the click position in flow coordinates
  const onEdgeClick = useCallback(
    (event: React.MouseEvent, rfEdge: Edge) => {
      if (state.pinned?.type === 'link' && state.pinned.id === rfEdge.id) {
        setPinned(null); // click same edge → unpin
      } else {
        setPreview(null);
        let flowPos: { x: number; y: number };
        if (panelRef.current) {
          const rect = panelRef.current.getBoundingClientRect();
          const panelX = event.clientX - rect.left;
          const panelY = event.clientY - rect.top;
          flowPos = { x: (panelX - vpX) / zoom, y: (panelY - vpY) / zoom };
        } else {
          flowPos = { x: 0, y: 0 };
        }
        setPinned({ type: 'link', id: rfEdge.id }, flowPos);
      }
    },
    [state.pinned, setPinned, setPreview, vpX, vpY, zoom]
  );

  // Node double-click: toggle inline editor (edit mode only)
  const onNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, rfNode: Node) => {
      if (!isEditing) {
        return;
      }
      setInlineEdit(
        state.inlineEdit?.type === 'node' && state.inlineEdit.id === rfNode.id
          ? null
          : { type: 'node', id: rfNode.id }
      );
    },
    [isEditing, state.inlineEdit, setInlineEdit]
  );

  // Edge double-click: toggle inline editor (edit mode only)
  const onEdgeDoubleClick = useCallback(
    (_event: React.MouseEvent, rfEdge: Edge) => {
      if (!isEditing) {
        return;
      }
      setInlineEdit(
        state.inlineEdit?.type === 'link' && state.inlineEdit.id === rfEdge.id
          ? null
          : { type: 'link', id: rfEdge.id }
      );
    },
    [isEditing, state.inlineEdit, setInlineEdit]
  );

  // Viewport move: capture start viewport; dismiss context menu; dismiss preview on scroll (not zoom)
  const onMoveStart = useCallback(
    (_event: MouseEvent | TouchEvent | null, viewport: Viewport) => {
      setContextMenu(null);
      moveStartViewport.current = viewport;
    },
    [setContextMenu]
  );

  const onMove = useCallback(
    (_event: MouseEvent | TouchEvent | null, viewport: Viewport) => {
      const start = moveStartViewport.current;
      if (start && (viewport.x !== start.x || viewport.y !== start.y) && viewport.zoom === start.zoom) {
        setPreview(null);
      }
    },
    [setPreview]
  );

  // Open context menu on blank-canvas click in edit mode; close pinned popup first
  const onPaneClick = useCallback(
    (event: React.MouseEvent) => {
      if (state.pinned) {
        setPinned(null);
        return;
      }
      if (!isEditing) {
        return;
      }
      setContextMenu({ clientX: event.clientX, clientY: event.clientY });
    },
    [isEditing, state.pinned, setPinned, setContextMenu]
  );

  // Prevent self-loop connections
  const isValidConnection = useCallback(
    (connection: Connection | Edge) => connection.source !== connection.target,
    []
  );

  // Dismiss context menu and pinned popup when a connection drag starts
  const onConnectStart = useCallback(() => {
    setContextMenu(null);
    setPinned(null);
  }, [setContextMenu, setPinned]);

  // Create a new link when a connection is dropped on a target node
  const onConnect = useCallback(
    (connection: Connection) => {
      const existingLinks = options.links ?? [];
      const maxId = existingLinks.reduce((max, l) => Math.max(max, l.id), 0);
      const newLink: LinkConfig = {
        id: maxId + 1,
        aNodeId: Number(connection.source),
        zNodeId: Number(connection.target),
        aInterface: '',
        zInterface: '',
        capacity: 0,
      };
      onOptionsChange({ ...options, links: [...existingLinks, newLink] });
    },
    [options, onOptionsChange]
  );

  // Commit node positions to panel options on every drag position change (edit mode only)
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      if (!isEditing) {
        return;
      }
      const posMap = new Map<string, { x: number; y: number }>();
      for (const change of changes) {
        if (change.type === 'position' && change.position != null) {
          posMap.set(change.id, change.position);
        }
      }
      if (posMap.size === 0) {
        return;
      }
      const updatedNodes = nodes.map((n) => {
        const pos = posMap.get(String(n.id));
        return pos != null ? { ...n, x: pos.x, y: pos.y } : n;
      });
      onOptionsChange({ ...options, nodes: updatedNodes });
    },
    [isEditing, nodes, options, onOptionsChange]
  );

  // Compute parallel link offsets (keyed by link id)
  const linkOffsets = useMemo(() => {
    const pairCount = new Map<string, number>();
    const offsets = new Map<number, number>();
    for (const link of links) {
      const a = Math.min(link.aNodeId, link.zNodeId);
      const b = Math.max(link.aNodeId, link.zNodeId);
      const key = `${a}\0${b}`;
      const idx = pairCount.get(key) ?? 0;
      offsets.set(link.id, getLinkOffset(idx));
      pairCount.set(key, idx + 1);
    }
    return offsets;
  }, [links]);

  // Build React Flow nodes (React Flow requires string IDs)
  const rfNodes: Node[] = useMemo(
    () =>
      nodes.map((node) => {
        const hasConfigError = node.statusQueryId != null && !queryMap.has(node.statusQueryId);

        let healthStatus: HealthStatus | null | undefined;
        if (node.statusQueryId != null) {
          const qc = queryMap.get(node.statusQueryId);
          healthStatus = qc && qc.type === 'nodeHealth'
            ? findHealthTimeSeries(data, qc, node.name)?.getLatestValue()?.value ?? null
            : null;
        }

        return {
          id: String(node.id),
          type: 'weathermapNode',
          position: { x: node.x ?? 0, y: node.y ?? 0 },
          data: {
            id: node.id,
            label: node.name === '' ? `#${node.id}` : transformLabel(node.name),
            nodeWidth,
            nodeHeight,
            hasConfigError,
            healthStatus,
            isEditing,
          } satisfies WeathermapNodeData,
          width: nodeWidth,
          height: nodeHeight,
          selectable: false,
          connectable: isEditing,
          dragHandle: '.iwm-move-zone',
        };
      }),
    [nodes, nodeWidth, nodeHeight, transformLabel, queryMap, data, isEditing]
  );

  // Build React Flow edges
  const rfEdges: Edge[] = useMemo(() => {
    return links
      .filter((link) => nodeMap.has(link.aNodeId) && nodeMap.has(link.zNodeId)) // skip orphaned links
      .map((link) => {
        const aNode = nodeMap.get(link.aNodeId)!;
        const zNode = nodeMap.get(link.zNodeId)!;

        const hasInvalidQuery = linksWithInvalidQuery.has(link.id);
        const offsetPx = (linkOffsets.get(link.id) ?? 0) * linkParallelOffset * (link.aNodeId < link.zNodeId ? 1 : -1);

        let atozColor = GRAY_COLOR;
        let ztoaColor = GRAY_COLOR;
        let atozSpeed: string | null = null;
        let ztoaSpeed: string | null = null;

        if (!hasInvalidQuery) {
          // A→Z traffic: A half-arrow (A node → midpoint)
          if (link.atozQueryId != null) {
            const qc = queryMap.get(link.atozQueryId);
            if (qc && qc.type === 'linkTraffic') {
              const latest = findTrafficTimeSeries({
                data,
                queryConfig: qc,
                srcNode: { name: aNode.name, iface: link.aInterface },
                dstNode: { name: zNode.name, iface: link.zInterface },
              })?.getLatestValue() ?? null;
              if (latest !== null) {
                atozColor = getUtilizationColor(latest.value, link.capacity, options.colorScaleMode ?? 'linear', logScaleBase, colorScale);
                atozSpeed = formatSI(latest.value);
              }
            }
          }

          // Z→A traffic: Z half-arrow (Z node → midpoint)
          if (link.ztoaQueryId != null) {
            const qc = queryMap.get(link.ztoaQueryId);
            if (qc && qc.type === 'linkTraffic') {
              const latest = findTrafficTimeSeries({
                data,
                queryConfig: qc,
                srcNode: { name: zNode.name, iface: link.zInterface },
                dstNode: { name: aNode.name, iface: link.aInterface },
              })?.getLatestValue() ?? null;
              if (latest !== null) {
                ztoaColor = getUtilizationColor(latest.value, link.capacity, options.colorScaleMode ?? 'linear', logScaleBase, colorScale);
                ztoaSpeed = formatSI(latest.value);
              }
            }
          }
        }

        return {
          id: String(link.id),
          source: String(link.aNodeId),
          target: String(link.zNodeId),
          type: 'weathermapEdge',
          data: {
            atozColor,
            ztoaColor,
            atozSpeed,
            ztoaSpeed,
            offsetPx,
            hasConfigError: hasInvalidQuery,
            labelBgColor: theme.colors.background.canvas,
            strokeWidth: linkStrokeWidth,
            tipLength: linkTipLength,
            labelDistance: linkLabelDistance,
            labelFontSize: linkLabelFontSize,
          } satisfies WeathermapEdgeData,
        };
      });
  }, [links, data, nodeMap, queryMap, linksWithInvalidQuery, linkOffsets, linkParallelOffset, options.colorScaleMode, logScaleBase, colorScale, theme, linkStrokeWidth, linkTipLength, linkLabelDistance, linkLabelFontSize]);

  // Full-panel error state for invalid label transform config
  if (labelTransformError) {
    return (
      <div
        className={styles.errorState}
        style={{ width, height }}
      >
        <div>
          <strong>Configuration error:</strong>
          <br />
          {labelTransformError}
        </div>
      </div>
    );
  }

  return (
    <div ref={panelRef} className={styles.panelRoot} style={{ width, height }} onMouseMove={onPanelMouseMove}>
      {/* Warning banner for invalid query references */}
      {linksWithInvalidQuery.size > 0 && (
        <div className={styles.warningBanner}>
          <strong>Warning:</strong> Invalid query reference on:{' '}
          {links
            .filter((l) => linksWithInvalidQuery.has(l.id))
            .map(linkLabel)
            .join(', ')}
        </div>
      )}

      <ColorLegend colorScale={colorScale} colorScaleMode={options.colorScaleMode ?? 'linear'} logScaleBase={logScaleBase} />

      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        nodesDraggable={isEditing}
        nodesConnectable={isEditing}
        elementsSelectable={false}
        snapToGrid={true}
        snapGrid={[10, 10]}
        onNodesChange={onNodesChange}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        onNodeClick={onNodeClick}
        onEdgeMouseEnter={onEdgeMouseEnter}
        onEdgeMouseLeave={onEdgeMouseLeave}
        onEdgeClick={onEdgeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onEdgeDoubleClick={onEdgeDoubleClick}
        onPaneClick={onPaneClick}
        onMoveStart={onMoveStart}
        onMove={onMove}
        isValidConnection={isValidConnection}
        onConnectStart={onConnectStart}
        onConnect={onConnect}
        connectionLineComponent={ConnectionLine}
        connectionLineStyle={{ strokeWidth: linkStrokeWidth }}
        defaultViewport={{ x: 0, y: 0, zoom: options.defaultZoom ?? 1.0 }}
        colorMode={theme.isLight ? 'light' : theme.isDark ? 'dark' : undefined}
        className={styles.reactFlow}
        proOptions={{ hideAttribution: true }}
      >
        <Background color={theme.colors.border.weak} />
        <Controls showInteractive={false} fitViewOptions={{ padding: { left: `${COLOR_LEGEND_TOTAL_WIDTH}px` } }}>
          <ControlButton
            title={`Color scheme: ${colorSchemeName}`}
            aria-label={`Cycle color scheme (Current: ${colorSchemeName})`}
            onClick={() => setColorSchemeIndex((colorSchemeIndex + 1) % colorScales.length)}
          >
            <Icon name="palette" aria-hidden />
          </ControlButton>
        </Controls>
        {
          nodes.length === 0 && (
            <div className={styles.emptyState}>
              Click/tap the canvas to add a node.
            </div>
          )
        }
      </ReactFlow>
      <CanvasContextMenu options={options} onOptionsChange={onOptionsChange} />
      <WeathermapPopup options={options} data={data} />
      <InlineEditor options={options} onOptionsChange={onOptionsChange} />
    </div>
  );
};

const getStyles = (theme: GrafanaTheme2) => ({
  errorState: css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: theme.colors.background.primary,
    color: theme.colors.error.text,
    padding: theme.spacing(2),
    textAlign: 'center',
  }),
  warningBanner: css({
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    background: theme.colors.warning.transparent,
    borderBottom: `1px solid ${theme.colors.warning.border}`,
    color: theme.colors.warning.text,
    padding: theme.spacing(0.5, 1),
    fontSize: theme.typography.bodySmall.fontSize,
  }),
  panelRoot: css({
    position: 'relative',
  }),
  emptyState: css({
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
    color: theme.colors.text.secondary,
  }),
  reactFlow: css({
    background: theme.colors.background.canvas,
  }),
});
