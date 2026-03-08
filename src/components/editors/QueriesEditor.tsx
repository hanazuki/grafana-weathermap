import React from 'react';
import { StandardEditorProps } from '@grafana/data';
import { Button, Input, InlineField, InlineFieldRow, Select } from '@grafana/ui';
import { LinkTrafficQueryConfig } from '../../types';

function nextId(items: Array<{ id: number }>): number {
  return items.length === 0 ? 1 : Math.max(...items.map((x) => x.id)) + 1;
}

export const QueriesEditor: React.FC<StandardEditorProps<LinkTrafficQueryConfig[]>> = ({
  value = [],
  onChange,
  context,
}) => {
  const usedRefIds = new Set(value.map((q) => q.refId));
  const refIdOptions: Array<{ label: string; value: string }> = Array.from(
    new Set((context.data ?? []).map((f) => f.refId).filter((r): r is string => !!r))
  ).map((r) => ({ label: r, value: r }));

  const add = () =>
    onChange([
      ...value,
      { id: nextId(value), refId: '', type: 'linkTraffic', instanceLabelKey: 'instance', interfaceLabelKey: 'ifName' },
    ]);
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const update = (i: number, patch: Partial<LinkTrafficQueryConfig>) =>
    onChange(value.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));

  return (
    <div>
      {value.map((q, i) => (
        <InlineFieldRow key={q.id}>
          <InlineField label="RefId">
            <Select<string>
              options={refIdOptions.filter((o) => o.value === q.refId || !usedRefIds.has(o.value))}
              value={q.refId || null}
              onChange={(opt) => update(i, { refId: opt.value! })}
              placeholder="A"
              width={8}
            />
          </InlineField>
          <InlineField label="Instance label">
            <Input
              value={q.instanceLabelKey}
              onChange={(e) => update(i, { instanceLabelKey: e.currentTarget.value })}
              placeholder="instance"
              width={12}
            />
          </InlineField>
          <InlineField label="Interface label">
            <Input
              value={q.interfaceLabelKey}
              onChange={(e) => update(i, { interfaceLabelKey: e.currentTarget.value })}
              placeholder="ifName"
              width={12}
            />
          </InlineField>
          <Button variant="destructive" icon="trash-alt" size="sm" aria-label="Remove query" onClick={() => remove(i)} />
        </InlineFieldRow>
      ))}
      <Button icon="plus" variant="secondary" size="sm" onClick={add}>
        Add Query Config
      </Button>
    </div>
  );
};
