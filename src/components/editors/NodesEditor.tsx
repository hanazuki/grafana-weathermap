import React, { useState } from 'react';
import { StandardEditorProps } from '@grafana/data';
import { Button, Combobox, Input, InlineField, InlineFieldRow, FieldSet } from '@grafana/ui';
import { NodeConfig, QueryConfig, WeathermapOptions } from '../../types';

function nextId(items: Array<{ id: number }>): number {
  return items.length === 0 ? 1 : Math.max(...items.map((x) => x.id)) + 1;
}

type NodeEditorProps = {
  node: NodeConfig;
  queries: QueryConfig[];
  update: (patch: Partial<NodeConfig>) => void;
};

const NodeEditor: React.FC<NodeEditorProps> = ({ node, queries, update }) => {
  const healthQueryOptions = queries
    .filter((q) => q.type === 'nodeHealth')
    .map((q) => ({ label: `${q.refId} (#${q.id})`, value: q.id }));
  const noQueryOption = { label: '— none —', value: 0 };

  return (
    <FieldSet>
      <InlineFieldRow>
        <InlineField label="Name" grow>
          <Input
            value={node.name}
            onChange={(e) => update({ name: e.currentTarget.value })}
            placeholder="router-1"
          />
        </InlineField>
      </InlineFieldRow>
      <InlineFieldRow>
        <InlineField label="X">
          <Input
            type="number"
            value={node.x ?? 0}
            onChange={(e) => update({ x: Number(e.currentTarget.value) })}
            width={8}
          />
        </InlineField>
        <InlineField label="Y">
          <Input
            type="number"
            value={node.y ?? 0}
            onChange={(e) => update({ y: Number(e.currentTarget.value) })}
            width={8}
          />
        </InlineField>
      </InlineFieldRow>
      <InlineFieldRow>
        <InlineField label="Health query" grow>
          <Combobox
            options={[noQueryOption, ...healthQueryOptions]}
            value={node.statusQueryId ?? 0}
            onChange={(opt) => update({ statusQueryId: opt.value !== 0 ? opt.value : undefined })}
            width={16}
          />
        </InlineField>
      </InlineFieldRow>
    </FieldSet>
  );
};

export const NodesEditor: React.FC<StandardEditorProps<NodeConfig[], unknown, WeathermapOptions>> = ({
  value = [],
  onChange,
  context,
}) => {
  const queries: QueryConfig[] = context.options?.queries ?? [];
  const [index, setIndex] = useState<number | null>(value.length > 0 ? 0 : null);

  const add = () => {
    onChange([...value, { id: nextId(value), name: '', x: 0, y: 0 }]);
    setIndex(value.length);
  };

  const remove = () => {
    if (index === null) {
      return;
    }
    const i = index;
    setIndex(i > 0 ? i - 1 : value.length > 1 ? 0 : null);
    onChange(value.filter((_, idx) => idx !== i));
  };

  const update = (patch: Partial<NodeConfig>) =>
    onChange(value.map((n, idx) => (idx === index ? { ...n, ...patch } : n)));

  const node: NodeConfig | null = index !== null ? value[index] : null;

  const selectOptions = value
    .map((n, idx) => ({ label: `${n.name} (#${n.id})`, value: idx }))
    .sort((a, b) => (a.label < b.label ? -1 : a.label > b.label ? 1 : 0));

  return (
    <>
      <div style={{ display: 'flex', gap: '4px' }}>
        <div style={{ flex: 1 }}>
          <Combobox
            options={selectOptions}
            value={index}
            onChange={(opt) => setIndex(opt.value)}
            placeholder="— select a node —"
          />
        </div>
        <Button icon="plus" variant="secondary" aria-label="Add node" onClick={add} />
        <Button variant="destructive" icon="trash-alt" aria-label="Remove node" onClick={remove} disabled={node === null} />
      </div>
      {node !== null ? (
        <NodeEditor node={node} queries={queries} update={update} />
      ) : (
        <div style={{ padding: '8px 0', color: 'gray' }}>No nodes yet — click + to add one</div>
      )}
    </>
  );
};
