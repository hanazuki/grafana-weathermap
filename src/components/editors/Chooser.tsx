import React from 'react';
import { Button, Combobox, useStyles2 } from '@grafana/ui';
import { getStyles } from './styles';

type ChooserProps = {
  options: Array<{ label: string; value: number }>;
  value: number | null;
  onChange: (value: number) => void;
  placeholder?: string;
  onAdd: () => void;
  addLabel: string;
  onDelete: () => void;
  deleteLabel: string;
  addTestId?: string;
  deleteTestId?: string;
};

export const Chooser: React.FC<ChooserProps> = ({
  options,
  value,
  onChange,
  placeholder,
  onAdd,
  addLabel,
  onDelete,
  deleteLabel,
  addTestId,
  deleteTestId,
}) => {
  const styles = useStyles2(getStyles);
  return <div className={styles.chooser}>
    <div className={styles.comboboxWrapper}>
      <Combobox
        options={options}
        value={value}
        onChange={(opt) => onChange(opt.value)}
        placeholder={placeholder}
      />
    </div>
    <Button
      icon="plus"
      variant="secondary"
      aria-label={addLabel}
      onClick={onAdd}
      data-testid={addTestId}
    />
    <Button
      variant="destructive"
      icon="trash-alt"
      aria-label={deleteLabel}
      onClick={onDelete}
      disabled={value === null}
      data-testid={deleteTestId}
    />
  </div>;
};
