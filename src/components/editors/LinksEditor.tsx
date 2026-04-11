import React, { useState } from 'react';
import { StandardEditorProps } from '@grafana/data';
import { Button, Combobox, Field, InlineField, InlineFieldRow, Input, useStyles2 } from '@grafana/ui';
import { getStyles } from './styles';
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
  return queries.filter((q) => q.type === 'linkTraffic').map((q) => ({ label: q.refId, value: q.id }));
}

export type LinkEditorProps = {
  link: LinkConfig;
  nodes: NodeConfig[];
  queries: QueryConfig[];
  update: (patch: Partial<LinkConfig>) => void;
};

export const LinkEditor: React.FC<LinkEditorProps> = ({ link, nodes, queries, update }) => {
  const nodeOpts = nodeOptions(nodes);
  const queryOpts = queryOptions(queries);
  const noQueryOption = { label: '— none —', value: 0 };

  return <>
    <InlineFieldRow>
      <InlineField label="A node" grow shrink>
        <Combobox
          options={nodeOpts}
          value={link.aNodeId}
          onChange={(opt) => update({ aNodeId: opt.value })}
          data-testid="iwm-editor-link-anode"
        />
      </InlineField>
      <InlineField label="A iface" grow shrink>
        <Input
          value={link.aInterface}
          onChange={(e) => update({ aInterface: e.currentTarget.value })}
          placeholder="eth0"
          data-testid="iwm-editor-link-aiface"
        />
      </InlineField>
    </InlineFieldRow>

    <InlineFieldRow>
      <InlineField label="Z node" grow shrink>
        <Combobox
          options={nodeOpts}
          value={link.zNodeId}
          onChange={(opt) => update({ zNodeId: opt.value })}
          data-testid="iwm-editor-link-znode"
        />
      </InlineField>
      <InlineField label="Z iface" grow shrink>
        <Input
          value={link.zInterface}
          onChange={(e) => update({ zInterface: e.currentTarget.value })}
          placeholder="eth0"
          data-testid="iwm-editor-link-ziface"
        />
      </InlineField>
    </InlineFieldRow>

    <InlineFieldRow>
      <InlineField label="Capacity (bps)" grow shrink>
        <Input
          type="number"
          value={link.capacity}
          onChange={(e) => update({ capacity: Number(e.currentTarget.value) })}
          data-testid="iwm-editor-link-capacity"
        />
      </InlineField>
    </InlineFieldRow>

    <InlineFieldRow>
      <InlineField label="A→Z query" grow shrink>
        <Combobox
          options={[noQueryOption, ...queryOpts]}
          value={link.atozQueryId ?? 0}
          onChange={(opt) => update({ atozQueryId: opt.value || undefined })}
          data-testid="iwm-editor-link-atoz-query"
        />
      </InlineField>
    </InlineFieldRow>

    <InlineFieldRow>
      <InlineField label="Z→A query" grow shrink>
        <Combobox
          options={[noQueryOption, ...queryOpts]}
          value={link.ztoaQueryId ?? 0}
          onChange={(opt) => update({ ztoaQueryId: opt.value || undefined })}
          data-testid="iwm-editor-link-ztoa-query"
        />
      </InlineField>
    </InlineFieldRow>
  </>;
};

export const LinksEditor: React.FC<StandardEditorProps<LinkConfig[], unknown, WeathermapOptions>> = ({
  value = [],
  onChange,
  context,
}) => {
  const styles = useStyles2(getStyles);
  const nodes: NodeConfig[] = context.options?.nodes ?? [];
  const queries: QueryConfig[] = context.options?.queries ?? [];

  const [index, setIndex] = useState<number | null>(value.length > 0 ? 0 : null);

  const add = () => {
    onChange([
      ...value,
      {
        id: nextId(value),
        aNodeId: nodes[0]?.id ?? 0,
        zNodeId: nodes[1]?.id ?? 0,
        aInterface: '',
        zInterface: '',
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
      const aName = nodeName(nodes, l.aNodeId);
      const zName = nodeName(nodes, l.zNodeId);
      return { label: `${aName} → ${zName} (#${l.id})`, value: idx };
    })
    .sort((a, b) => (a.label < b.label ? -1 : a.label > b.label ? 1 : 0));

  return (
    <>
      <Field label="Link" description="Select link to edit">
        <div className={styles.toolbar}>
          <div className={styles.comboboxWrapper}>
            <Combobox
              options={selectOptions}
              value={index}
              onChange={(opt) => setIndex(opt.value)}
              placeholder="— select a link —"
            />
          </div>
          <Button icon="plus" variant="secondary" aria-label="Add link" onClick={add} data-testid="iwm-editor-link-add" />
          <Button variant="destructive" icon="trash-alt" aria-label="Remove link" onClick={remove} disabled={link === null} />
        </div>
      </Field>
      {link !== null ? (
        <LinkEditor link={link} nodes={nodes} queries={queries} update={update} />
      ) : (
        <div className={styles.emptyState}>No links yet — click + to add one</div>
      )}
    </>
  );
};
