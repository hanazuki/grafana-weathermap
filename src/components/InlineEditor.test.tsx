import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

// @grafana/ui's Combobox calls canvas.measureText; stub it for jsdom.
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: () => ({ measureText: () => ({ width: 0 }) }),
});

// jsdom doesn't implement pointer capture APIs.
Element.prototype.setPointerCapture = jest.fn();
Element.prototype.releasePointerCapture = jest.fn();

import { PopupProvider, type PopupTarget, usePopup } from '../context/PopupContext';
import type { WeathermapOptions } from '../types';
import { InlineEditor } from './InlineEditor';

const baseOptions: WeathermapOptions = {
  nodes: [
    { id: 1, name: 'router-1', x: 0, y: 0 },
    { id: 2, name: 'switch-2', x: 100, y: 0 },
  ],
  links: [{ id: 3, aNodeId: 1, zNodeId: 2, aInterface: 'eth0', zInterface: 'eth0', capacity: 1_000_000_000 }],
  queries: [],
  colorScaleMode: 'linear',
};

// Helper: renders InlineEditor inside a PopupProvider and sets inlineEdit via a child component
function SetInlineEdit({ target }: { target: PopupTarget }) {
  const { setInlineEdit } = usePopup();
  React.useEffect(() => {
    setInlineEdit(target);
  }, [target, setInlineEdit]);
  return null;
}

function renderWithTarget(target: PopupTarget, options = baseOptions) {
  const onOptionsChange = jest.fn();
  render(
    <PopupProvider>
      <SetInlineEdit target={target} />
      <InlineEditor options={options} onOptionsChange={onOptionsChange} />
    </PopupProvider>,
  );
  return { onOptionsChange };
}

describe('InlineEditor', () => {
  it('renders nothing when no target is set', () => {
    const { container } = render(
      <PopupProvider>
        <InlineEditor options={baseOptions} onOptionsChange={jest.fn()} />
      </PopupProvider>,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the panel when a node target is set', () => {
    renderWithTarget({ type: 'node', id: '1' });
    expect(screen.getByText('router-1 (#1)')).toBeInTheDocument();
  });

  it('renders the correct title for a link target', () => {
    renderWithTarget({ type: 'link', id: '3' });
    expect(screen.getByText('router-1 → switch-2 (#3)')).toBeInTheDocument();
  });

  it('closes the panel when the × button is clicked', () => {
    renderWithTarget({ type: 'node', id: '1' });
    expect(screen.getByText('router-1 (#1)')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Close editor'));
    expect(screen.queryByText('router-1 (#1)')).not.toBeInTheDocument();
  });

  it('closes the panel when the × button is clicked after the header receives pointerdown', () => {
    // Regression test: header pointerdown sets pointer capture on the panel, which previously
    // swallowed the click event on the close button before it could fire.
    renderWithTarget({ type: 'node', id: '1' });
    fireEvent.pointerDown(screen.getByTestId('iwm-inline-editor-header'));
    fireEvent.click(screen.getByLabelText('Close editor'));
    expect(screen.queryByText('router-1 (#1)')).not.toBeInTheDocument();
  });
});
