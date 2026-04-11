import { CoreApp } from '@grafana/data';
import { usePanelContext } from '@grafana/ui';

export default () => usePanelContext().app === CoreApp.PanelEditor;
