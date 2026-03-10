import React, { useCallback, useMemo, useRef } from 'react';
import { PanelProps } from '@grafana/data';
import { useTheme2 } from '@grafana/ui';
import { ReactFlow, ReactFlowProvider, Background, useViewport, type Node, type Edge, type NodeChange, type Viewport } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { WeathermapOptions, NodeConfig, QueryConfig } from '../types';
import { WeathermapNode, type WeathermapNodeData } from './WeathermapNode';
import { WeathermapEdge, type WeathermapEdgeData } from './WeathermapEdge';
import { ColorLegend } from './ColorLegend';
import { CanvasContextMenu } from './CanvasContextMenu';
import { WeathermapPopup } from './WeathermapPopup';
import { PopupProvider, usePopup } from '../context/PopupContext';
import { findTrafficSeries, findHealthSeries } from '../utils/matching';
import { getUtilizationColor, GRAY_COLOR, rainbow } from '../utils/color';
import { formatBps } from '../utils/format';
import useIsEditing from 'hooks/isEditing';

const NODE_TYPES = { weathermapNode: WeathermapNode };
const EDGE_TYPES = { weathermapEdge: WeathermapEdge };

function getLinkOffset(index: number, parallelOffset: number): number {
  if (index === 0) {
    return 0;
  }
  return Math.ceil(index / 2) * parallelOffset * (index % 2 === 1 ? 1 : -1);
}

export const WeathermapPanel: React.FC<PanelProps<WeathermapOptions>> = (props) => (
  <PopupProvider>
    <ReactFlowProvider>
      <WeathermapPanelContent {...props} />
    </ReactFlowProvider>
  </PopupProvider>
);

const WeathermapPanelContent: React.FC<PanelProps<WeathermapOptions>> = ({ options, data, width, height, onOptionsChange }) => {
  const theme = useTheme2();
  const isEditing = useIsEditing();
  const { state, setContextMenu, setPinned, setPreview, setCursorPos } = usePopup();
  const { x: vpX, y: vpY, zoom } = useViewport();
  const panelRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const moveStartViewport = useRef<Viewport | null>(null);

  const nodes = options.nodes ?? [];
  const links = options.links ?? [];
  const queries = options.queries ?? [];
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
  const transformLabel = useMemo<(name: string) => string>(() => {
    if (!options.nodeLabelPattern || !options.nodeLabelReplacement) {
      return (name) => name;
    }
    const regex = new RegExp(options.nodeLabelPattern);
    return (name) => name.replace(regex, options.nodeLabelReplacement!);
  }, [options.nodeLabelPattern, options.nodeLabelReplacement]);

  // Determine which links have invalid query references
  const linksWithInvalidQuery = useMemo(() => {
    const bad = new Set<number>();
    for (const link of links) {
      if ((link.inQueryId != null && !queryMap.has(link.inQueryId)) ||
        (link.outQueryId != null && !queryMap.has(link.outQueryId))) {
        bad.add(link.id);
      }
    }
    return bad;
  }, [links, queryMap]);

  // Human-readable link label for warning banner: "Source name → Target name (#id)"
  const linkLabel = (link: (typeof links)[number]): string => {
    const srcName = nodeMap.get(link.source)?.name ?? `#${link.source}`;
    const tgtName = nodeMap.get(link.target)?.name ?? `#${link.target}`;
    return `${srcName} → ${tgtName} (#${link.id})`;
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

  // Drag lifecycle: clear preview on drag start; block preview during drag
  const onNodeDragStart = useCallback(() => {
    isDragging.current = true;
    setPreview(null);
  }, [setPreview]);

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
      const a = Math.min(link.source, link.target);
      const b = Math.max(link.source, link.target);
      const key = `${a}\0${b}`;
      const idx = pairCount.get(key) ?? 0;
      offsets.set(link.id, getLinkOffset(idx, linkParallelOffset));
      pairCount.set(key, idx + 1);
    }
    return offsets;
  }, [links, linkParallelOffset]);

  // Build React Flow nodes (React Flow requires string IDs)
  const rfNodes: Node[] = useMemo(
    () =>
      nodes.map((node) => {
        const hasConfigError = node.statusQueryId != null && !queryMap.has(node.statusQueryId);

        let healthStatus = null;
        if (node.statusQueryId != null) {
          const qc = queryMap.get(node.statusQueryId);
          healthStatus = qc && qc.type === 'nodeHealth'
            ? findHealthSeries(data, qc, node.name)
            : 'unavailable';
        }

        return {
          id: String(node.id),
          type: 'weathermapNode',
          position: { x: node.x ?? 0, y: node.y ?? 0 },
          data: {
            label: node.name === '' ? `#${node.id}` : transformLabel(node.name),
            nodeWidth,
            nodeHeight,
            theme,
            hasConfigError,
            healthStatus,
          } satisfies WeathermapNodeData,
          width: nodeWidth,
          height: nodeHeight,
          selectable: false,
          connectable: false,
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nodes, nodeWidth, nodeHeight, transformLabel, theme, queryMap, data]
  );

  // Build React Flow edges
  const rfEdges: Edge[] = useMemo(() => {
    return links
      .filter((link) => nodeMap.has(link.source) && nodeMap.has(link.target)) // skip orphaned links
      .map((link) => {
        const hasInvalidQuery = linksWithInvalidQuery.has(link.id);
        const offsetPx = linkOffsets.get(link.id) ?? 0;

        let outColor = GRAY_COLOR;
        let inColor = GRAY_COLOR;
        let outSpeed: string | null = null;
        let inSpeed: string | null = null;

        if (!hasInvalidQuery) {
          // Out-traffic: source half-arrow (source→midpoint)
          if (link.outQueryId != null) {
            const qc = queryMap.get(link.outQueryId);
            if (qc && qc.type === 'linkTraffic') {
              const srcNode = nodeMap.get(link.source)!;
              const tgtNode = nodeMap.get(link.target)!;
              const instance = link.outReversed ? tgtNode.name : srcNode.name;
              const iface = link.outReversed ? link.targetInterface : link.sourceInterface;
              const result = findTrafficSeries(data, qc, instance, iface);
              if (result.found && result.value !== null) {
                outColor = getUtilizationColor(result.value, link.capacity, options.colorScaleMode ?? 'linear', logScaleBase, rainbow);
                outSpeed = formatBps(result.value);
              }
            }
          }

          // In-traffic: target half-arrow (target→midpoint)
          if (link.inQueryId != null) {
            const qc = queryMap.get(link.inQueryId);
            if (qc && qc.type === 'linkTraffic') {
              const srcNode = nodeMap.get(link.source)!;
              const tgtNode = nodeMap.get(link.target)!;
              const instance = link.inReversed ? srcNode.name : tgtNode.name;
              const iface = link.inReversed ? link.sourceInterface : link.targetInterface;
              const result = findTrafficSeries(data, qc, instance, iface);
              if (result.found && result.value !== null) {
                inColor = getUtilizationColor(result.value, link.capacity, options.colorScaleMode ?? 'linear', logScaleBase, rainbow);
                inSpeed = formatBps(result.value);
              }
            }
          }
        }

        return {
          id: String(link.id),
          source: String(link.source),
          target: String(link.target),
          type: 'weathermapEdge',
          data: {
            outColor,
            inColor,
            outSpeed,
            inSpeed,
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
  }, [links, data, nodeMap, queryMap, linksWithInvalidQuery, linkOffsets, options.colorScaleMode, logScaleBase, theme, linkStrokeWidth, linkTipLength, linkLabelDistance, linkLabelFontSize]);

  // Full-panel error state for invalid label transform config
  if (labelTransformError) {
    return (
      <div
        style={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: theme.colors.background.primary,
          color: theme.colors.error.text,
          padding: 16,
          textAlign: 'center',
        }}
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
    <div ref={panelRef} style={{ width, height, position: 'relative' }} onMouseMove={onPanelMouseMove}>
      {/* Warning banner for invalid query references */}
      {linksWithInvalidQuery.size > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            background: theme.colors.warning.transparent,
            borderBottom: `1px solid ${theme.colors.warning.border}`,
            color: theme.colors.warning.text,
            padding: '4px 8px',
            fontSize: theme.typography.bodySmall.fontSize,
          }}
        >
          <strong>Warning:</strong> Invalid query reference on:{' '}
          {links
            .filter((l) => linksWithInvalidQuery.has(l.id))
            .map(linkLabel)
            .join(', ')}
        </div>
      )}

      <ColorLegend colorScale={rainbow} colorScaleMode={options.colorScaleMode ?? 'linear'} logScaleBase={logScaleBase} />

      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        nodesDraggable={isEditing}
        nodesConnectable={false}
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
        onPaneClick={onPaneClick}
        onMoveStart={onMoveStart}
        onMove={onMove}
        defaultViewport={{ x: 0, y: 0, zoom: options.defaultZoom ?? 1.0 }}
        style={{ background: theme.colors.background.canvas }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color={theme.colors.border.weak} />
        {nodes.length === 0 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              color: theme.colors.text.secondary,
            }}
          >
            Add nodes in the panel editor to get started.
          </div>
        )}
      </ReactFlow>
      <CanvasContextMenu options={options} onOptionsChange={onOptionsChange} />
      <WeathermapPopup options={options} data={data} />
    </div>
  );
};
