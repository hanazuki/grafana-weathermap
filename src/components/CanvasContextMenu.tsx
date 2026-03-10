import React, { useCallback } from 'react';
import { ContextMenu, MenuItem } from '@grafana/ui';
import { useReactFlow } from '@xyflow/react';

import { WeathermapOptions, NodeConfig } from '../types';
import { usePopup } from '../context/PopupContext';

interface CanvasContextMenuProps {
  options: WeathermapOptions;
  onOptionsChange: (options: WeathermapOptions) => void;
}

export const CanvasContextMenu: React.FC<CanvasContextMenuProps> = ({ options, onOptionsChange }) => {
  const { state, setContextMenu } = usePopup();
  const { screenToFlowPosition } = useReactFlow();

  const onClose = useCallback(() => {
    setContextMenu(null);
  }, [setContextMenu]);

  const handleAddNode = useCallback(() => {
    if (!state.contextMenu) {
      return;
    }

    // Convert viewport pixel coords to React Flow canvas coords
    const { clientX, clientY } = state.contextMenu;
    const flowPos = screenToFlowPosition({ x: clientX, y: clientY });

    const nodeWidth = options.nodeWidth ?? 120;
    const nodeHeight = options.nodeHeight ?? 40;

    // Center the node on the click point and snap to 10 px grid
    const x = Math.round((flowPos.x - nodeWidth / 2) / 10) * 10;
    const y = Math.round((flowPos.y - nodeHeight / 2) / 10) * 10;

    const existingNodes = options.nodes ?? [];
    const nextId =
      existingNodes.length > 0 ? Math.max(...existingNodes.map((n: NodeConfig) => n.id)) + 1 : 1;

    const newNode: NodeConfig = { id: nextId, name: '', x, y };

    onOptionsChange({ ...options, nodes: [...existingNodes, newNode] });
    setContextMenu(null);
  }, [state.contextMenu, screenToFlowPosition, options, onOptionsChange, setContextMenu]);

  if (!state.contextMenu) {
    return null;
  }

  return (
    <ContextMenu
      x={state.contextMenu.clientX}
      y={state.contextMenu.clientY}
      onClose={onClose}
      renderMenuItems={() => <MenuItem label="Add node here" onClick={handleAddNode} />}
    />
  );
};
