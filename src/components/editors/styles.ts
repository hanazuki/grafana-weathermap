import { GrafanaTheme2 } from '@grafana/data';
import { css } from '@emotion/css';

export const getStyles = (theme: GrafanaTheme2) => ({
  toolbar: css({ display: 'flex', gap: theme.spacing(0.5) }),
  comboboxWrapper: css({ flex: 1 }),
  emptyState: css({ padding: theme.spacing(1, 0), color: theme.colors.text.secondary }),
});
