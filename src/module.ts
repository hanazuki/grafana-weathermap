import { PanelPlugin } from '@grafana/data';
import { WeathermapOptions } from './types';
import { WeathermapPanel } from './components/WeathermapPanel';
import { NodesEditor } from './components/editors/NodesEditor';
import { LinksEditor } from './components/editors/LinksEditor';
import { QueriesEditor } from './components/editors/QueriesEditor';

export const plugin = new PanelPlugin<WeathermapOptions>(WeathermapPanel).setPanelOptions((builder) => {
  return builder
    .addSelect({
      path: 'colorScaleMode',
      name: 'Color scale mode',
      description: 'How utilization percentage is mapped to color steps.',
      defaultValue: 'linear',
      settings: {
        options: [
          { value: 'linear', label: 'Linear' },
          { value: 'log', label: 'Logarithmic' },
        ],
      },
    })
    .addNumberInput({
      path: 'defaultZoom',
      name: 'Default zoom',
      description: 'Initial zoom level (1.0 = 100%).',
      defaultValue: 1.0,
    })
    .addNumberInput({
      path: 'nodeWidth',
      name: 'Node width (px)',
      defaultValue: 120,
    })
    .addNumberInput({
      path: 'nodeHeight',
      name: 'Node height (px)',
      defaultValue: 40,
    })
    .addTextInput({
      path: 'nodeLabelPattern',
      name: 'Node label pattern',
      description: 'Regex applied to node ID to produce display label. Must be set together with replacement.',
      defaultValue: '',
    })
    .addTextInput({
      path: 'nodeLabelReplacement',
      name: 'Node label replacement',
      description: 'Replacement string for node label pattern. Supports $1, $2 capture groups.',
      defaultValue: '',
    })
    .addCustomEditor({
      id: 'nodes',
      path: 'nodes',
      name: 'Nodes',
      editor: NodesEditor,
      defaultValue: [],
    })
    .addCustomEditor({
      id: 'links',
      path: 'links',
      name: 'Links',
      editor: LinksEditor,
      defaultValue: [],
    })
    .addCustomEditor({
      id: 'queries',
      path: 'queries',
      name: 'Query configs',
      description: 'Map query refIds to label keys used for instance+interface matching.',
      editor: QueriesEditor,
      defaultValue: [],
    });
});
