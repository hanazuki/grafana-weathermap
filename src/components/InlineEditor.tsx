import React, { useEffect, useRef, useState } from 'react';
import { GrafanaTheme2 } from '@grafana/data';
import { IconButton, useStyles2 } from '@grafana/ui';
import { css } from '@emotion/css';

import { WeathermapOptions } from '../types';
import { usePopup } from '../context/PopupContext';
import { NodeEditor } from './editors/NodesEditor';
import { LinkEditor } from './editors/LinksEditor';

interface Props {
  options: WeathermapOptions;
  onOptionsChange: (options: WeathermapOptions) => void;
}

export const InlineEditor: React.FC<Props> = ({ options, onOptionsChange }) => {
  const styles = useStyles2(getStyles);
  const { state: { inlineEdit }, setInlineEdit } = usePopup();

  const nodes = options.nodes ?? [];
  const links = options.links ?? [];
  const queries = options.queries ?? [];

  // Auto-close when the edited element is deleted from options
  useEffect(() => {
    if (!inlineEdit) {
      return;
    }
    const id = Number(inlineEdit.id);
    if (inlineEdit.type === 'node' && !nodes.some((n) => n.id === id)) {
      setInlineEdit(null);
    } else if (inlineEdit.type === 'link' && !links.some((l) => l.id === id)) {
      setInlineEdit(null);
    }
  }, [inlineEdit, nodes, links, setInlineEdit]);

  // Drag state
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dragOffset = useRef<{ x: number; y: number } | null>(null);

  const onHeaderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    dragOffset.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    panelRef.current?.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragOffset.current) {
      return;
    }
    e.stopPropagation();
    setPosition({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    dragOffset.current = null;
  };

  if (!inlineEdit) {
    return null;
  }

  const id = Number(inlineEdit.id);

  if (inlineEdit.type === 'node') {
    const node = nodes.find((n) => n.id === id);
    if (!node) {
      return null;
    }
    const title = `${node.name} (#${node.id})`;
    const update = (patch: Partial<typeof node>) =>
      onOptionsChange({ ...options, nodes: nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)) });

    return (
      <div
        ref={panelRef}
        className={styles.panel}
        style={{ left: position.x, top: position.y }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        data-testid="iwm-inline-editor"
      >
        <div className={styles.header} onPointerDown={onHeaderPointerDown} data-testid="iwm-inline-editor-header">
          <span className={styles.title} title={title}>{title}</span>
          {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
          <span className={styles.closeButtonWrapper} onPointerDown={(e) => e.stopPropagation()}>
            <IconButton name="times" tooltip="Close editor" onClick={() => setInlineEdit(null)} />
          </span>
        </div>
        <div className={styles.body}>
          <NodeEditor node={node} queries={queries} update={update} />
        </div>
      </div>
    );
  }

  // link
  const link = links.find((l) => l.id === id);
  if (!link) {
    return null;
  }
  const aName = nodes.find((n) => n.id === link.aNodeId)?.name ?? `#${link.aNodeId}`;
  const zName = nodes.find((n) => n.id === link.zNodeId)?.name ?? `#${link.zNodeId}`;
  const title = `${aName} → ${zName} (#${link.id})`;
  const update = (patch: Partial<typeof link>) =>
    onOptionsChange({ ...options, links: links.map((l) => (l.id === id ? { ...l, ...patch } : l)) });

  return (
    <div
      ref={panelRef}
      className={styles.panel}
      style={{ left: position.x, top: position.y }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      data-testid="iwm-inline-editor"
    >
      <div className={styles.header} onPointerDown={onHeaderPointerDown} data-testid="iwm-inline-editor-header">
        <span className={styles.title} title={title}>{title}</span>
        {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
        <span className={styles.closeButtonWrapper} onPointerDown={(e) => e.stopPropagation()}>
          <IconButton name="times" tooltip="Close editor" onClick={() => setInlineEdit(null)} />
        </span>
      </div>
      <div className={styles.body}>
        <LinkEditor link={link} nodes={nodes} queries={queries} update={update} />
      </div>
    </div>
  );
};

const getStyles = (theme: GrafanaTheme2) => ({
  panel: css({
    position: 'absolute',
    width: 300,
    zIndex: 110,
    borderRadius: theme.shape.radius.default,
    border: `1px solid ${theme.colors.border.medium}`,
    background: theme.colors.background.primary,
    boxShadow: theme.shadows.z2,
  }),
  header: css({
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(0.5, 0.5, 0.5, 1),
    borderBottom: `1px solid ${theme.colors.border.medium}`,
    background: theme.colors.background.secondary,
    cursor: 'grab',
    userSelect: 'none',
    '&:active': { cursor: 'grabbing' },
  }),
  title: css({
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: theme.typography.bodySmall.fontSize,
    fontWeight: theme.typography.fontWeightMedium,
  }),
  closeButtonWrapper: css({
    display: 'flex',
  }),
  body: css({
    padding: theme.spacing(1),
    overflowY: 'visible',
  }),
});
