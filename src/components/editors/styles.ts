import { css } from '@emotion/css';
import type { GrafanaTheme2 } from '@grafana/data';

export const getStyles = (theme: GrafanaTheme2) => ({
  chooser: css({ display: 'flex', gap: theme.spacing(0.5) }),
  comboboxWrapper: css({ flex: 1 }),
  emptyState: css({ padding: theme.spacing(1, 0), color: theme.colors.text.secondary }),
});
