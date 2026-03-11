import React, { useState } from 'react';
import { StandardEditorProps } from '@grafana/data';
import { Button, Combobox, FieldSet, InlineField, InlineFieldRow, Input, Switch } from '@grafana/ui';
import { LinkConfig, NodeConfig, QueryConfig, WeathermapOptions } from '../../types';

function nextId(items: Array<{ id: number }>): number {
  return items.length === 0 ? 1 : Math.max(...items.map((x) => x.id)) + 1;
}

function nodeName(nodes: NodeConfig[], nodeId: number): string {
  const node = nodes.find((n) => n.id === nodeId);
  return node ? node.name : `#${nodeId}`;
}

function nodeOptions(nodes: NodeConfig[]) {
  return nodes.map((n) => ({ label: `${n.name} (#${n.id})`, value: n.id }));
}

function queryOptions(queries: QueryConfig[]) {
  return queries.map((q) => ({ label: q.refId, value: q.id }));
}

type LinkEditorProps = {
  link: LinkConfig;
  nodes: NodeConfig[];
  queries: QueryConfig[];
  update: (patch: Partial<LinkConfig>) => void;
};

const LinkEditor: React.FC<LinkEditorProps> = ({ link, nodes, queries, update }) => {
  const nodeOpts = nodeOptions(nodes);
  const queryOpts = queryOptions(queries);
  const noQueryOption = { label: '— none —', value: 0 };

  return (
    <FieldSet>
      <InlineFieldRow>
        <InlineField label="Source node" grow>
          <Combobox
            options={nodeOpts}
            value={link.source}
            onChange={(opt) => update({ source: opt.value })}
          />
        </InlineField>
        <InlineField label="Src iface">
          <Input
            value={link.sourceInterface}
            onChange={(e) => update({ sourceInterface: e.currentTarget.value })}
            placeholder="eth0"
            width={10}
          />
        </InlineField>
      </InlineFieldRow>

      <InlineFieldRow>
        <InlineField label="Target node" grow>
          <Combobox
            options={nodeOpts}
            value={link.target}
            onChange={(opt) => update({ target: opt.value })}
          />
        </InlineField>
        <InlineField label="Tgt iface">
          <Input
            value={link.targetInterface}
            onChange={(e) => update({ targetInterface: e.currentTarget.value })}
            placeholder="eth0"
            width={10}
          />
        </InlineField>
      </InlineFieldRow>

      <InlineFieldRow>
        <InlineField label="Capacity (bps)">
          <Input
            type="number"
            value={link.capacity}
            onChange={(e) => update({ capacity: Number(e.currentTarget.value) })}
            width={16}
          />
        </InlineField>
      </InlineFieldRow>

      <InlineFieldRow>
        <InlineField label="Out query" tooltip="Query for egress (source→target) traffic">
          <Combobox
            options={[noQueryOption, ...queryOpts]}
            value={link.outQueryId ?? 0}
            onChange={(opt) => update({ outQueryId: opt.value || undefined })}
            width={12}
          />
        </InlineField>
        <InlineField label="Reversed" tooltip="Match target side instead of source side">
          <Switch
            value={link.outReversed ?? false}
            onChange={(e) => update({ outReversed: e.currentTarget.checked })}
          />
        </InlineField>
      </InlineFieldRow>

      <InlineFieldRow>
        <InlineField label="In query" tooltip="Query for ingress (target→source) traffic">
          <Combobox
            options={[noQueryOption, ...queryOpts]}
            value={link.inQueryId ?? 0}
            onChange={(opt) => update({ inQueryId: opt.value || undefined })}
            width={12}
          />
        </InlineField>
        <InlineField label="Reversed" tooltip="Match source side instead of target side">
          <Switch
            value={link.inReversed ?? false}
            onChange={(e) => update({ inReversed: e.currentTarget.checked })}
          />
        </InlineField>
      </InlineFieldRow>
    </FieldSet>
  );
};

export const LinksEditor: React.FC<StandardEditorProps<LinkConfig[], unknown, WeathermapOptions>> = ({
  value = [],
  onChange,
  context,
}) => {
  const nodes: NodeConfig[] = context.options?.nodes ?? [];
  const queries: QueryConfig[] = context.options?.queries ?? [];

  const [index, setIndex] = useState<number | null>(value.length > 0 ? 0 : null);

  const add = () => {
    onChange([
      ...value,
      {
        id: nextId(value),
        source: nodes[0]?.id ?? 0,
        target: nodes[1]?.id ?? 0,
        sourceInterface: '',
        targetInterface: '',
        capacity: 1_000_000_000,
      },
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

  const update = (patch: Partial<LinkConfig>) =>
    onChange(value.map((l, idx) => (idx === index ? { ...l, ...patch } : l)));

  const link: LinkConfig | null = index !== null ? value[index] : null;

  const selectOptions = value
    .map((l, idx) => {
      const src = nodeName(nodes, l.source);
      const tgt = nodeName(nodes, l.target);
      return { label: `${src} → ${tgt} (#${l.id})`, value: idx };
    })
    .sort((a, b) => (a.label < b.label ? -1 : a.label > b.label ? 1 : 0));

  return (
    <>
      <div style={{ display: 'flex', gap: '4px' }}>
        <div style={{ flex: 1 }}>
          <Combobox
            options={selectOptions}
            value={index}
            onChange={(opt) => setIndex(opt.value)}
            placeholder="— select a link —"
          />
        </div>
        <Button icon="plus" variant="secondary" aria-label="Add link" onClick={add} />
        <Button variant="destructive" icon="trash-alt" aria-label="Remove link" onClick={remove} disabled={link === null} />
      </div>
      {link !== null ? (
        <LinkEditor link={link} nodes={nodes} queries={queries} update={update} />
      ) : (
        <div style={{ padding: '8px 0', color: 'gray' }}>No links yet — click + to add one</div>
      )}
    </>
  );
};
