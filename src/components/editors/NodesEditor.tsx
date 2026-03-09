import React, { useState } from 'react';
import { StandardEditorProps } from '@grafana/data';
import { Button, Input, InlineField, InlineFieldRow, Select, FieldSet } from '@grafana/ui';
import { NodeConfig } from '../../types';

function nextId(items: Array<{ id: number }>): number {
  return items.length === 0 ? 1 : Math.max(...items.map((x) => x.id)) + 1;
}

type NodeEditorProps = {
  node: NodeConfig,
  update: (patch: Partial<NodeConfig>) => void,
}

const NodeEditor: React.FC<NodeEditorProps> = ({ node, update }) => {
  return <FieldSet key={node.id}>
    <InlineFieldRow>
      <InlineField label="Name" grow>
        <Input
          value={node.name}
          onChange={(e) => update({ name: e.currentTarget.value })}
          placeholder="router-1" />
      </InlineField>
    </InlineFieldRow>
    <InlineFieldRow>
      <InlineField label="X">
        <Input
          type="number"
          value={node.x ?? 0}
          onChange={(e) => update({ x: Number(e.currentTarget.value) })}
          width={8} />
      </InlineField>
      <InlineField label="Y">
        <Input
          type="number"
          value={node.y ?? 0}
          onChange={(e) => update({ y: Number(e.currentTarget.value) })}
          width={8} />
      </InlineField>
    </InlineFieldRow>
  </FieldSet>;
}


export const NodesEditor: React.FC<StandardEditorProps<NodeConfig[]>> = ({ value = [], onChange }) => {
  const [index, select] = useState<number | null>(value.length > 0 ? 0 : null);

  const add = () => {
    onChange([...value, { id: nextId(value), name: "", x: 0, y: 0 }]);
    select(value.length);
  };
  const remove = () => {
    select(value.length > 1 ? 0 : null);
    onChange(value.filter((_, idx) => idx !== index));
  };
  const update = (patch: Partial<NodeConfig>) =>
    onChange(value.map((n, idx) => (idx === index ? { ...n, ...patch } : n)));

  const node: NodeConfig | null = index !== null ? value[index] : null;

  const selectOptions = value.map((node, idx) => ({ label: `${node.name} (#${node.id})`, value: idx }))
    .sort(({ label: a }, { label: b }) => a < b ? -1 : b > a ? 1 : 0);

  return (
    <>
      <div style={{ display: "flex", gap: "4px" }}>
        <Select
          options={selectOptions}
          value={index}
          onChange={(opt) => select(opt.value!)}
          grow
          isSearchable
        />

        <Button icon="plus" variant="secondary" aria-label="Add Node" onClick={add} />
        <Button variant="destructive" icon="trash-alt" aria-label="Remove node" onClick={remove} disabled={node === null} />
      </div>
      {node !== null ? NodeEditor({ node, update }) : null}
    </>
  );
};
