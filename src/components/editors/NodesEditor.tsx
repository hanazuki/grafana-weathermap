import React, { useState } from 'react';
import { StandardEditorProps } from '@grafana/data';
import { Combobox, Input, InlineField, InlineFieldRow, useStyles2, Field } from '@grafana/ui';
import { getStyles } from './styles';
import { Chooser } from './Chooser';
import { NodeConfig, QueryConfig, WeathermapOptions } from '../../types';

function nextId(items: Array<{ id: number }>): number {
  return items.length === 0 ? 1 : Math.max(...items.map((x) => x.id)) + 1;
}

function queryOptions(queries: QueryConfig[]) {
  return queries.filter((q) => q.type === 'nodeHealth').map((q) => ({ label: q.refId, value: q.id }));
}

export type NodeEditorProps = {
  node: NodeConfig;
  queries: QueryConfig[];
  update: (patch: Partial<NodeConfig>) => void;
};

export const NodeEditor: React.FC<NodeEditorProps> = ({ node, queries, update }) => {
  const healthQueryOptions = queryOptions(queries);
  const noQueryOption = { label: '— none —', value: 0 };

  return <>
    <InlineFieldRow>
      <InlineField label="Name" grow shrink>
        <Input
          value={node.name}
          onChange={(e) => update({ name: e.currentTarget.value })}
          placeholder="router-1.example.com"
          data-testid="iwm-editor-node-name"
        />
      </InlineField>
    </InlineFieldRow>
    <InlineFieldRow>
      <InlineField label="Description" grow shrink>
        <Input
          value={node.description ?? ''}
          onChange={(e) => update({ description: e.currentTarget.value })}
          data-testid="iwm-editor-node-description"
        />
      </InlineField>
    </InlineFieldRow>
    <InlineFieldRow>
      <InlineField label="X" grow>
        <Input
          type="number"
          value={node.x ?? 0}
          onChange={(e) => update({ x: Number(e.currentTarget.value) })}
          data-testid="iwm-editor-node-x"
        />
      </InlineField>
      <InlineField label="Y" grow>
        <Input
          type="number"
          value={node.y ?? 0}
          onChange={(e) => update({ y: Number(e.currentTarget.value) })}
          data-testid="iwm-editor-node-y"
        />
      </InlineField>
    </InlineFieldRow>
    <InlineFieldRow>
      <InlineField label="Health query" grow shrink>
        <Combobox<number>
          options={[noQueryOption, ...healthQueryOptions]}
          value={node.statusQueryId ?? 0}
          onChange={(opt) => update({ statusQueryId: opt.value || undefined })}
        />
      </InlineField>
    </InlineFieldRow>
  </>;
};

export const NodesEditor: React.FC<StandardEditorProps<NodeConfig[], unknown, WeathermapOptions>> = ({
  value = [],
  onChange,
  context,
}) => {
  const styles = useStyles2(getStyles);
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

  const effectiveIndex = (index !== null && index < value.length) ? index : null;
  const node: NodeConfig | null = effectiveIndex !== null ? value[effectiveIndex] : null;

  const selectOptions = value
    .map((n, idx) => ({ label: `${n.name} (#${n.id})`, value: idx }))
    .sort((a, b) => (a.label < b.label ? -1 : a.label > b.label ? 1 : 0));

  return <>
    <Field label="Node" description="Select a node to edit">
      <Chooser
        options={selectOptions}
        value={effectiveIndex}
        onChange={setIndex}
        placeholder="— select a node —"
        onAdd={add}
        addLabel="Add node"
        onDelete={remove}
        deleteLabel="Remove node"
        addTestId="iwm-editor-node-add"
        deleteTestId="iwm-editor-node-delete"
      />
    </Field>
    {node !== null ? (
      <NodeEditor node={node} queries={queries} update={update} />
    ) : (
      <div className={styles.emptyState}>No nodes yet — click + to add one</div>
    )}
  </>;
};
