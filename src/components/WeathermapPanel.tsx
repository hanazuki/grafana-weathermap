import React, { useMemo } from 'react';
import { PanelProps } from '@grafana/data';
import { useTheme2 } from '@grafana/ui';
import { ReactFlow, ReactFlowProvider, Background, type Node, type Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { WeathermapOptions, NodeConfig, LinkTrafficQueryConfig } from '../types';
import { WeathermapNode, type WeathermapNodeData } from './WeathermapNode';
import { WeathermapEdge, type WeathermapEdgeData } from './WeathermapEdge';
import { findTrafficSeries } from '../utils/matching';
import { getUtilizationColor, GRAY_COLOR } from '../utils/color';
import { formatBps } from '../utils/format';

const NODE_TYPES = { weathermapNode: WeathermapNode };
const EDGE_TYPES = { weathermapEdge: WeathermapEdge };

function getLinkOffset(index: number): number {
  if (index === 0) {
    return 0;
  }
  return Math.ceil(index / 2) * 6 * (index % 2 === 1 ? 1 : -1);
}

export const WeathermapPanel: React.FC<PanelProps<WeathermapOptions>> = ({ options, data, width, height }) => {
  const theme = useTheme2();

  const nodes = options.nodes ?? [];
  const links = options.links ?? [];
  const queries = options.queries ?? [];
  const nodeWidth = options.nodeWidth ?? 120;
  const nodeHeight = options.nodeHeight ?? 40;

  // Fast lookup maps
  const nodeMap = useMemo(() => new Map<number, NodeConfig>(nodes.map((n) => [n.id, n])), [nodes]);
  const queryMap = useMemo(
    () => new Map<number, LinkTrafficQueryConfig>(queries.map((q) => [q.id, q])),
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

  // Human-readable link label for warning banner: "Source name → Target name #id"
  const linkLabel = (link: (typeof links)[number]): string => {
    const srcName = nodeMap.get(link.source)?.name ?? `#${link.source}`;
    const tgtName = nodeMap.get(link.target)?.name ?? `#${link.target}`;
    return `${srcName} → ${tgtName} #${link.id}`;
  };

  // Compute parallel link offsets (keyed by link id)
  const linkOffsets = useMemo(() => {
    const pairCount = new Map<string, number>();
    const offsets = new Map<number, number>();
    for (const link of links) {
      const a = Math.min(link.source, link.target);
      const b = Math.max(link.source, link.target);
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
      nodes.map((node) => ({
        id: String(node.id),
        type: 'weathermapNode',
        position: { x: node.x ?? 0, y: node.y ?? 0 },
        data: {
          label: transformLabel(node.name),
          nodeWidth,
          nodeHeight,
          theme,
          hasInvalidRefId: false, // nodes have no query refs in Phase 1
        } satisfies WeathermapNodeData,
        width: nodeWidth,
        height: nodeHeight,
        draggable: false,
        selectable: false,
        connectable: false,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nodes, nodeWidth, nodeHeight, transformLabel, theme]
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
            if (qc) {
              const srcNode = nodeMap.get(link.source)!;
              const tgtNode = nodeMap.get(link.target)!;
              const instance = link.outReversed ? tgtNode.name : srcNode.name;
              const iface = link.outReversed ? link.targetInterface : link.sourceInterface;
              const result = findTrafficSeries(data, qc, instance, iface);
              if (result.found && result.value !== null) {
                outColor = getUtilizationColor(result.value, link.capacity, options.colorScaleMode ?? 'linear');
                outSpeed = formatBps(result.value);
              }
            }
          }

          // In-traffic: target half-arrow (target→midpoint)
          if (link.inQueryId != null) {
            const qc = queryMap.get(link.inQueryId);
            if (qc) {
              const srcNode = nodeMap.get(link.source)!;
              const tgtNode = nodeMap.get(link.target)!;
              const instance = link.inReversed ? srcNode.name : tgtNode.name;
              const iface = link.inReversed ? link.sourceInterface : link.targetInterface;
              const result = findTrafficSeries(data, qc, instance, iface);
              if (result.found && result.value !== null) {
                inColor = getUtilizationColor(result.value, link.capacity, options.colorScaleMode ?? 'linear');
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
            hasInvalidRefId: hasInvalidQuery,
          } satisfies WeathermapEdgeData,
        };
      });
  }, [links, data, nodeMap, queryMap, linksWithInvalidQuery, linkOffsets, options.colorScaleMode]);

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
    <div style={{ width, height, position: 'relative' }}>
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

      <ReactFlowProvider>
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={NODE_TYPES}
          edgeTypes={EDGE_TYPES}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
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
      </ReactFlowProvider>
    </div>
  );
};
