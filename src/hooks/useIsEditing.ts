import { CoreApp } from '@grafana/data';
import { usePanelContext } from '@grafana/ui';

export const useIsEditing = () => usePanelContext().app === CoreApp.PanelEditor;
