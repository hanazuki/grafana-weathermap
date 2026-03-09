import React, { useState } from 'react';
import { StandardEditorProps } from '@grafana/data';
import { Button, FieldSet, Input, InlineField, InlineFieldRow, Select } from '@grafana/ui';
import { LinkTrafficQueryConfig } from '../../types';

function nextId(items: Array<{ id: number }>): number {
  return items.length === 0 ? 1 : Math.max(...items.map((x) => x.id)) + 1;
}

type QueryEditorProps = {
  query: LinkTrafficQueryConfig;
  refIdOptions: Array<{ label: string; value: string }>;
  usedRefIds: Set<string>;
  update: (patch: Partial<LinkTrafficQueryConfig>) => void;
};

const QueryEditor: React.FC<QueryEditorProps> = ({ query, refIdOptions, usedRefIds, update }) => {
  return (
    <FieldSet>
      <InlineFieldRow>
        <InlineField label="RefId">
          <Select<string>
            options={refIdOptions.filter((o) => o.value === query.refId || !usedRefIds.has(o.value))}
            value={query.refId || null}
            onChange={(opt) => update({ refId: opt.value! })}
            placeholder="A"
            width={8}
          />
        </InlineField>
        <InlineField label="Instance label">
          <Input
            value={query.instanceLabelKey}
            onChange={(e) => update({ instanceLabelKey: e.currentTarget.value })}
            placeholder="instance"
            width={12}
          />
        </InlineField>
        <InlineField label="Interface label">
          <Input
            value={query.interfaceLabelKey}
            onChange={(e) => update({ interfaceLabelKey: e.currentTarget.value })}
            placeholder="ifName"
            width={12}
          />
        </InlineField>
      </InlineFieldRow>
    </FieldSet>
  );
};

export const QueriesEditor: React.FC<StandardEditorProps<LinkTrafficQueryConfig[]>> = ({
  value = [],
  onChange,
  context,
}) => {
  const usedRefIds = new Set(value.map((q) => q.refId));
  const refIdOptions: Array<{ label: string; value: string }> = Array.from(
    new Set((context.data ?? []).map((f) => f.refId).filter((r): r is string => !!r))
  ).map((r) => ({ label: r, value: r }));

  const [index, setIndex] = useState<number | null>(value.length > 0 ? 0 : null);

  const add = () => {
    onChange([
      ...value,
      { id: nextId(value), refId: '', type: 'linkTraffic', instanceLabelKey: 'instance', interfaceLabelKey: 'ifName' },
    ]);
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

  const update = (patch: Partial<LinkTrafficQueryConfig>) =>
    onChange(value.map((q, idx) => (idx === index ? { ...q, ...patch } : q)));

  const query: LinkTrafficQueryConfig | null = index !== null ? value[index] : null;

  const TYPE_LABELS: Record<string, string> = {
    linkTraffic: 'link traffic',
    nodeHealth: 'node health',
  };

  const selectOptions = value
    .map((q, idx) => ({ label: `${q.refId || '(empty)'} \u2013 ${TYPE_LABELS[q.type] ?? q.type} (#${q.id})`, value: idx }))
    .sort((a, b) => (a.label < b.label ? -1 : a.label > b.label ? 1 : 0));

  return (
    <>
      <div style={{ display: 'flex', gap: '4px' }}>
        <Select
          options={selectOptions}
          value={index}
          onChange={(opt) => setIndex(opt.value!)}
          placeholder="— select a query config —"
          grow
          isSearchable
        />
        <Button icon="plus" variant="secondary" aria-label="Add query config" onClick={add} />
        <Button variant="destructive" icon="trash-alt" aria-label="Remove query config" onClick={remove} disabled={query === null} />
      </div>
      {query !== null ? (
        <QueryEditor query={query} refIdOptions={refIdOptions} usedRefIds={usedRefIds} update={update} />
      ) : (
        <div style={{ padding: '8px 0', color: 'gray' }}>No query configs yet — click + to add one</div>
      )}
    </>
  );
};
