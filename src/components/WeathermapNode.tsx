import React from 'react';
import { Handle, NodeProps, Position } from '@xyflow/react';
import { GrafanaTheme2 } from '@grafana/data';

export interface WeathermapNodeData {
  label: string;
  nodeWidth: number;
  nodeHeight: number;
  theme: GrafanaTheme2;
  hasInvalidRefId: boolean;
  [key: string]: unknown;
}

const HANDLE_STYLE: React.CSSProperties = {
  width: 0,
  height: 0,
  minWidth: 0,
  minHeight: 0,
  background: 'transparent',
  border: 'none',
  borderRadius: 0,
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
};

export const WeathermapNode: React.FC<NodeProps> = ({ data }) => {
  const { label, nodeWidth, nodeHeight, theme, hasInvalidRefId } = data as WeathermapNodeData;
  const t = theme as GrafanaTheme2;

  const style: React.CSSProperties = {
    width: nodeWidth,
    height: nodeHeight,
    background: t.colors.background.secondary,
    border: `2px solid ${hasInvalidRefId ? 'orange' : t.colors.border.medium}`,
    borderRadius: t.shape.radius.default,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: t.typography.bodySmall.fontSize,
    color: t.colors.text.primary,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    padding: '0 8px',
    boxSizing: 'border-box',
  };

  return (
    <>
      <Handle type="source" position={Position.Top} style={HANDLE_STYLE} />
      <Handle type="target" position={Position.Top} style={HANDLE_STYLE} />
      <div style={style} title={String(label)}>
        {label}
      </div>
    </>
  );
};
