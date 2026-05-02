import { PanelPlugin } from '@grafana/data';
import { LinksEditor } from './components/editors/LinksEditor';
import { NodesEditor } from './components/editors/NodesEditor';
import { QueriesEditor } from './components/editors/QueriesEditor';
import { WeathermapPanel } from './components/WeathermapPanel';
import type { WeathermapOptions } from './types';

const APPEARANCE = ['Appearance'];
const DATA = ['Data'];

export const plugin = new PanelPlugin<WeathermapOptions>(WeathermapPanel).setPanelOptions((builder) => {
  return builder
    .addNumberInput({
      path: 'dataMaxAge',
      name: 'Data max age (s)',
      description:
        'If the latest data point is older than this many seconds relative to the panel time range end, it is treated as missing. Leave empty to use the query interval automatically.',
      defaultValue: 300,
      category: DATA,
      settings: { min: 1, integer: true },
    })
    .addTextInput({
      path: 'nodeLabelPattern',
      name: 'Node label pattern',
      description: 'Regex applied to node name to produce display label. Must be set together with replacement.',
      defaultValue: '',
    })
    .addTextInput({
      path: 'nodeLabelReplacement',
      name: 'Node label replacement',
      description: 'Replacement string for node label pattern. Supports $1, $2 capture groups.',
      defaultValue: '',
    })
    .addSelect({
      path: 'colorScaleMode',
      name: 'Color scale mode',
      description: 'How utilization percentage is mapped to color steps.',
      defaultValue: 'linear',
      category: APPEARANCE,
      settings: {
        options: [
          { value: 'linear', label: 'Linear' },
          { value: 'log', label: 'Logarithmic' },
        ],
      },
    })
    .addSliderInput({
      path: 'logScaleBase',
      name: 'Log scale base',
      description:
        'Base of the logarithm used for log scale mode. Higher = stronger compression of low-utilization range.',
      defaultValue: 10,
      category: APPEARANCE,
      showIf: (config) => config.colorScaleMode === 'log',
      settings: { min: 2, max: 10, step: 1 },
    })
    .addNumberInput({
      path: 'nodeWidth',
      name: 'Node width (px)',
      defaultValue: 120,
      category: APPEARANCE,
    })
    .addNumberInput({
      path: 'nodeHeight',
      name: 'Node height (px)',
      defaultValue: 40,
      category: APPEARANCE,
    })
    .addNumberInput({
      path: 'linkStrokeWidth',
      name: 'Link stroke width (px)',
      defaultValue: 6,
      category: APPEARANCE,
      settings: { min: 1, integer: true },
    })
    .addNumberInput({
      path: 'linkTipLength',
      name: 'Link tip length (px)',
      defaultValue: 8,
      category: APPEARANCE,
      settings: { min: 1, integer: true },
    })
    .addNumberInput({
      path: 'linkLabelDistance',
      name: 'Default link label distance (px)',
      defaultValue: 40,
      category: APPEARANCE,
      settings: { min: 1, integer: true },
    })
    .addNumberInput({
      path: 'linkParallelOffset',
      name: 'Parallel link offset (px)',
      defaultValue: 8,
      category: APPEARANCE,
      settings: { min: 1, integer: true },
    })
    .addNumberInput({
      path: 'linkLabelFontSize',
      name: 'Label font size (px)',
      defaultValue: 10,
      category: APPEARANCE,
      settings: { min: 1, integer: true },
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
