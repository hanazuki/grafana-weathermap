import React from 'react';
import { StandardEditorProps } from '@grafana/data';
import { Button, Input, InlineField, InlineFieldRow } from '@grafana/ui';
import { NodeConfig } from '../../types';

function nextId(items: Array<{ id: number }>): number {
  return items.length === 0 ? 1 : Math.max(...items.map((x) => x.id)) + 1;
}

export const NodesEditor: React.FC<StandardEditorProps<NodeConfig[]>> = ({ value = [], onChange }) => {
  const add = () => onChange([...value, { id: nextId(value), name: '', x: 0, y: 0 }]);
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const update = (i: number, patch: Partial<NodeConfig>) =>
    onChange(value.map((n, idx) => (idx === i ? { ...n, ...patch } : n)));

  return (
    <div>
      {value.map((node, i) => (
        <InlineFieldRow key={node.id}>
          <InlineField label="Name" grow>
            <Input
              value={node.name}
              onChange={(e) => update(i, { name: e.currentTarget.value })}
              placeholder="router-1"
            />
          </InlineField>
          <InlineField label="X">
            <Input
              type="number"
              value={node.x ?? 0}
              onChange={(e) => update(i, { x: Number(e.currentTarget.value) })}
              width={8}
            />
          </InlineField>
          <InlineField label="Y">
            <Input
              type="number"
              value={node.y ?? 0}
              onChange={(e) => update(i, { y: Number(e.currentTarget.value) })}
              width={8}
            />
          </InlineField>
          <Button variant="destructive" icon="trash-alt" size="sm" aria-label="Remove node" onClick={() => remove(i)} />
        </InlineFieldRow>
      ))}
      <Button icon="plus" variant="secondary" size="sm" onClick={add}>
        Add Node
      </Button>
    </div>
  );
};
