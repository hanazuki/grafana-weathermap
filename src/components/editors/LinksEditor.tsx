import React from 'react';
import { StandardEditorProps } from '@grafana/data';
import { Button, InlineField, InlineFieldRow, Input, Select, Switch } from '@grafana/ui';
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

export const LinksEditor: React.FC<StandardEditorProps<LinkConfig[], unknown, WeathermapOptions>> = ({
  value = [],
  onChange,
  context,
}) => {
  const nodes: NodeConfig[] = context.options?.nodes ?? [];
  const queries: QueryConfig[] = context.options?.queries ?? [];

  const add = () =>
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

  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  const update = (i: number, patch: Partial<LinkConfig>) =>
    onChange(value.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const nodeOpts = nodeOptions(nodes);
  const queryOpts = queryOptions(queries);
  const noQueryOption = { label: '— none —', value: 0 };

  return (
    <div>
      {value.map((link, i) => {
        const srcName = nodeName(nodes, link.source);
        const tgtName = nodeName(nodes, link.target);
        const header = `${srcName} → ${tgtName} #${link.id}`;

        return (
          <div key={link.id} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid rgba(128,128,128,0.2)' }}>
            <InlineFieldRow>
              <InlineField label={header} grow>
                <div />
              </InlineField>
              <Button variant="destructive" icon="trash-alt" size="sm" aria-label="Remove link" onClick={() => remove(i)} />
            </InlineFieldRow>

            <InlineFieldRow>
              <InlineField label="Source node" grow>
                <Select
                  options={nodeOpts}
                  value={link.source}
                  onChange={(opt) => update(i, { source: opt.value! })}
                  isSearchable
                />
              </InlineField>
              <InlineField label="Src iface">
                <Input
                  value={link.sourceInterface}
                  onChange={(e) => update(i, { sourceInterface: e.currentTarget.value })}
                  placeholder="eth0"
                  width={10}
                />
              </InlineField>
            </InlineFieldRow>

            <InlineFieldRow>
              <InlineField label="Target node" grow>
                <Select
                  options={nodeOpts}
                  value={link.target}
                  onChange={(opt) => update(i, { target: opt.value! })}
                  isSearchable
                />
              </InlineField>
              <InlineField label="Tgt iface">
                <Input
                  value={link.targetInterface}
                  onChange={(e) => update(i, { targetInterface: e.currentTarget.value })}
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
                  onChange={(e) => update(i, { capacity: Number(e.currentTarget.value) })}
                  width={16}
                />
              </InlineField>
            </InlineFieldRow>

            <InlineFieldRow>
              <InlineField label="Out query" tooltip="Query for egress (source→target) traffic">
                <Select
                  options={[noQueryOption, ...queryOpts]}
                  value={link.outQueryId ?? 0}
                  onChange={(opt) => update(i, { outQueryId: opt.value || undefined })}
                  width={12}
                />
              </InlineField>
              <InlineField label="Reversed" tooltip="Match target side instead of source side">
                <Switch
                  value={link.outReversed ?? false}
                  onChange={(e) => update(i, { outReversed: e.currentTarget.checked })}
                />
              </InlineField>
            </InlineFieldRow>

            <InlineFieldRow>
              <InlineField label="In query" tooltip="Query for ingress (target→source) traffic">
                <Select
                  options={[noQueryOption, ...queryOpts]}
                  value={link.inQueryId ?? 0}
                  onChange={(opt) => update(i, { inQueryId: opt.value || undefined })}
                  width={12}
                />
              </InlineField>
              <InlineField label="Reversed" tooltip="Match source side instead of target side">
                <Switch
                  value={link.inReversed ?? false}
                  onChange={(e) => update(i, { inReversed: e.currentTarget.checked })}
                />
              </InlineField>
            </InlineFieldRow>
          </div>
        );
      })}
      <Button icon="plus" variant="secondary" size="sm" onClick={add}>
        Add Link
      </Button>
    </div>
  );
};
