import React, { useState } from 'react';
import { StandardEditorProps } from '@grafana/data';
import { Button, Combobox, FieldSet, Input, InlineField, InlineFieldRow, useStyles2 } from '@grafana/ui';
import { getStyles } from './styles';
import { QueryConfig, LinkTrafficQueryConfig, NodeHealthQueryConfig } from '../../types';

function nextId(items: Array<{ id: number }>): number {
  return items.length === 0 ? 1 : Math.max(...items.map((x) => x.id)) + 1;
}

const TYPE_OPTIONS = [
  { label: 'link traffic', value: 'linkTraffic' as const },
  { label: 'node health', value: 'nodeHealth' as const },
];

const TYPE_LABELS: Record<string, string> = {
  linkTraffic: 'link traffic',
  nodeHealth: 'node health',
};

type QueryEditorProps = {
  query: QueryConfig;
  refIdOptions: Array<{ label: string; value: string }>;
  usedRefIds: Set<string>;
  update: (next: QueryConfig) => void;
};

const QueryEditor: React.FC<QueryEditorProps> = ({ query, refIdOptions, usedRefIds, update }) => {
  const changeType = (newType: 'linkTraffic' | 'nodeHealth') => {
    if (newType === query.type) {
      return;
    }
    if (newType === 'linkTraffic') {
      const next: LinkTrafficQueryConfig = {
        id: query.id,
        refId: query.refId,
        type: 'linkTraffic',
        instanceLabelKey: query.instanceLabelKey,
        interfaceLabelKey: 'ifName',
      };
      update(next);
    } else {
      const next: NodeHealthQueryConfig = {
        id: query.id,
        refId: query.refId,
        type: 'nodeHealth',
        instanceLabelKey: query.instanceLabelKey,
      };
      update(next);
    }
  };

  return (
    <FieldSet>
      <InlineFieldRow>
        <InlineField label="RefId">
          <Combobox<string>
            options={refIdOptions.filter((o) => o.value === query.refId || !usedRefIds.has(o.value))}
            value={query.refId || null}
            onChange={(opt) => update({ ...query, refId: opt.value })}
            placeholder="A"
            width={8}
          />
        </InlineField>
        <InlineField label="Type">
          <Combobox<'linkTraffic' | 'nodeHealth'>
            options={TYPE_OPTIONS}
            value={query.type}
            onChange={(opt) => changeType(opt.value)}
            width={14}
          />
        </InlineField>
      </InlineFieldRow>
      <InlineFieldRow>
        <InlineField label="Instance label">
          <Input
            value={query.instanceLabelKey}
            onChange={(e) => update({ ...query, instanceLabelKey: e.currentTarget.value })}
            placeholder="instance"
            width={12}
          />
        </InlineField>
        {query.type === 'linkTraffic' && (
          <InlineField label="Interface label">
            <Input
              value={query.interfaceLabelKey}
              onChange={(e) => update({ ...query, interfaceLabelKey: e.currentTarget.value } as LinkTrafficQueryConfig)}
              placeholder="ifName"
              width={12}
            />
          </InlineField>
        )}
      </InlineFieldRow>
    </FieldSet>
  );
};

export const QueriesEditor: React.FC<StandardEditorProps<QueryConfig[]>> = ({
  value = [],
  onChange,
  context,
}) => {
  const styles = useStyles2(getStyles);
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

  const update = (next: QueryConfig) =>
    onChange(value.map((q, idx) => (idx === index ? next : q)));

  const query: QueryConfig | null = index !== null ? value[index] : null;

  const selectOptions = value
    .map((q, idx) => ({ label: `${q.refId || '(empty)'} \u2013 ${TYPE_LABELS[q.type] ?? q.type} (#${q.id})`, value: idx }))
    .sort((a, b) => (a.label < b.label ? -1 : a.label > b.label ? 1 : 0));

  return (
    <>
      <div className={styles.toolbar}>
        <div className={styles.comboboxWrapper}>
          <Combobox
            options={selectOptions}
            value={index}
            onChange={(opt) => setIndex(opt.value)}
            placeholder="— select a query config —"
          />
        </div>
        <Button icon="plus" variant="secondary" aria-label="Add query config" onClick={add} />
        <Button variant="destructive" icon="trash-alt" aria-label="Remove query config" onClick={remove} disabled={query === null} />
      </div>
      {query !== null ? (
        <QueryEditor query={query} refIdOptions={refIdOptions} usedRefIds={usedRefIds} update={update} />
      ) : (
        <div className={styles.emptyState}>No query configs yet — click + to add one</div>
      )}
    </>
  );
};
