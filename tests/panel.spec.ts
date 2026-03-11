import { test, expect } from '@grafana/plugin-e2e';

test('Add nodes and edges', async ({
  panelEditPage,
  readProvisionedDataSource,
  page,
}) => {
  const ds = await readProvisionedDataSource({ fileName: 'datasources.yml' });
  await panelEditPage.datasource.set(ds.name);
  await panelEditPage.setVisualization('Interactive Network Weathermap');

  // Add 3 nodes with distinct positions so edges render
  await page.getByTestId('iwm-editor-node-add').click();
  await expect(page.getByTestId('iwm-node-1')).toHaveText('#1');
  await page.getByTestId('iwm-editor-node-name').fill('node-0');
  await page.getByTestId('iwm-editor-node-x').fill('100');

  await page.getByTestId('iwm-editor-node-add').click();
  await expect(page.getByTestId('iwm-node-2')).toHaveText('#2');
  await page.getByTestId('iwm-editor-node-name').fill('node-1');
  await page.getByTestId('iwm-editor-node-x').fill('300');

  await page.getByTestId('iwm-editor-node-add').click();
  await expect(page.getByTestId('iwm-node-3')).toHaveText('#3');
  await page.getByTestId('iwm-editor-node-name').fill('node-2');
  await page.getByTestId('iwm-editor-node-x').fill('500');

  await expect(page.getByTestId('iwm-node-1')).toHaveText('node-0');
  await expect(page.getByTestId('iwm-node-2')).toHaveText('node-1');
  await expect(page.getByTestId('iwm-node-3')).toHaveText('node-2');

  // Add edge node-0 → node-1 (defaults: source=nodes[0], target=nodes[1])
  await page.getByTestId('iwm-editor-link-add').click();

  // Add edge node-1 → node-2
  await page.getByTestId('iwm-editor-link-add').click();
  // Change source from node-0 to node-1
  await page.getByTestId('iwm-editor-link-source').fill('node-1');
  await page.getByRole('option', { name: 'node-1 (#2)' }).click();
  // Change target from node-1 to node-2
  await page.getByTestId('iwm-editor-link-target').fill('node-2');
  await page.getByRole('option', { name: 'node-2 (#3)' }).click();

  await expect(page.getByTestId('iwm-edge-1')).toBeVisible();
  await expect(page.getByTestId('iwm-edge-2')).toBeVisible();
});
