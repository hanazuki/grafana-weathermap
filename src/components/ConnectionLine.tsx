import React from 'react';
import { useTheme2 } from '@grafana/ui';
import type { ConnectionLineComponentProps } from '@xyflow/react';

export const ConnectionLine: React.FC<ConnectionLineComponentProps> = ({
  fromNode,
  toX,
  toY,
  connectionLineStyle,
}) => {
  const theme = useTheme2();

  const fromX = fromNode.internals.positionAbsolute.x + (fromNode.width ?? 0) / 2;
  const fromY = fromNode.internals.positionAbsolute.y + (fromNode.height ?? 0) / 2;

  return (
    <g>
      <line
        x1={fromX}
        y1={fromY}
        x2={toX}
        y2={toY}
        stroke={theme.colors.text.disabled}
        strokeWidth={connectionLineStyle?.strokeWidth ?? 4}
        fill="none"
      />
    </g>
  );
};
