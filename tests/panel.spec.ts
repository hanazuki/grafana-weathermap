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

test('parallel offset is symmetric for reversed edges', async ({
  panelEditPage,
  readProvisionedDataSource,
  page,
}) => {
  const ds = await readProvisionedDataSource({ fileName: 'datasources.yml' });
  await panelEditPage.datasource.set(ds.name);
  await panelEditPage.setVisualization('Interactive Network Weathermap');

  // Place both nodes at the same Y so edges are horizontal (dy=0).
  // This means the perpendicular offset is purely in the Y direction,
  // making the sign easy to assert.
  await page.getByTestId('iwm-editor-node-add').click();
  await page.getByTestId('iwm-editor-node-name').fill('node-a');
  await page.getByTestId('iwm-editor-node-x').fill('100');
  await page.getByTestId('iwm-editor-node-y').fill('100');

  await page.getByTestId('iwm-editor-node-add').click();
  await page.getByTestId('iwm-editor-node-name').fill('node-b');
  await page.getByTestId('iwm-editor-node-x').fill('400');
  await page.getByTestId('iwm-editor-node-y').fill('100');

  // Edge 1 (A→B, index 0): zero offset — serves as baseline.
  // Defaults: source=nodes[0]=node-a, target=nodes[1]=node-b.
  await page.getByTestId('iwm-editor-link-add').click();

  // Edge 2 (A→B, index 1): same direction, receives a non-zero offset.
  await page.getByTestId('iwm-editor-link-add').click();

  // Edge 3 (B→A, index 2): reversed direction.
  // After the fix the offset sign is flipped vs edge 2,
  // so the two edges end up on opposite sides of the A-B axis.
  await page.getByTestId('iwm-editor-link-add').click();
  await page.getByTestId('iwm-editor-link-source').fill('node-b');
  await page.getByRole('option', { name: 'node-b (#2)' }).click();
  await page.getByTestId('iwm-editor-link-target').fill('node-a');
  await page.getByRole('option', { name: 'node-a (#1)' }).click();

  await expect(page.getByTestId('iwm-edge-1')).toBeVisible();
  await expect(page.getByTestId('iwm-edge-2')).toBeVisible();
  await expect(page.getByTestId('iwm-edge-3')).toBeVisible();

  // Read the Y component of the translate transform applied to each edge.
  // The outer <g data-testid="iwm-edge-N"> contains a single <g transform="translate(ox,oy)">
  // child that carries the perpendicular offset. With dy=0 the offset is purely vertical.
  const getTranslateY = async (testId: string): Promise<number> => {
    const transform = await page
      .getByTestId(testId)
      .locator('> g')
      .getAttribute('transform');
    const match = transform?.match(/translate\(\s*[^,]+,\s*([^)]+)\)/);
    return match ? parseFloat(match[1]) : NaN;
  };

  const oy1 = await getTranslateY('iwm-edge-1');
  const oy2 = await getTranslateY('iwm-edge-2');
  const oy3 = await getTranslateY('iwm-edge-3');

  // Edge 1 is the first between this pair: no offset.
  expect(oy1).toBeCloseTo(0);

  // Edge 2 (A→B) must be displaced to one side.
  expect(oy2).not.toBeCloseTo(0);

  // Edge 3 (B→A) must be displaced to the OPPOSITE side from edge 2.
  // Before the fix both edges were translated in the same direction, causing them to overlap.
  expect(oy3).toBeCloseTo(-oy2);
});

test('Drag to connect creates a new link', async ({
  panelEditPage,
  readProvisionedDataSource,
  page,
}) => {
  const ds = await readProvisionedDataSource({ fileName: 'datasources.yml' });
  await panelEditPage.datasource.set(ds.name);
  await panelEditPage.setVisualization('Interactive Network Weathermap');

  // Add node A at x=50, y=100
  await page.getByTestId('iwm-editor-node-add').click();
  await page.getByTestId('iwm-editor-node-name').fill('node-a');
  await page.getByTestId('iwm-editor-node-x').fill('50');
  await page.getByTestId('iwm-editor-node-y').fill('100');

  // Add node B at x=300, y=100
  await page.getByTestId('iwm-editor-node-add').click();
  await page.getByTestId('iwm-editor-node-name').fill('node-b');
  await page.getByTestId('iwm-editor-node-x').fill('300');
  await page.getByTestId('iwm-editor-node-y').fill('100');

  await expect(page.getByTestId('iwm-node-1')).toHaveText('node-a');
  await expect(page.getByTestId('iwm-node-2')).toHaveText('node-b');

  // Drag from the connect zone of node A (x > 40px from its left edge) to node B
  const nodeA = page.getByTestId('iwm-node-1');
  const nodeB = page.getByTestId('iwm-node-2');

  const nodeABox = await nodeA.boundingBox();
  const nodeBBox = await nodeB.boundingBox();

  // Start drag at x+60 (within connect zone, past the 40px move zone boundary)
  await page.mouse.move(nodeABox!.x + 60, nodeABox!.y + nodeABox!.height / 2);
  await page.mouse.down();
  // Drag to the center of node B
  await page.mouse.move(nodeBBox!.x + nodeBBox!.width / 2, nodeBBox!.y + nodeBBox!.height / 2, { steps: 10 });
  await page.mouse.up();

  // A new link connecting node A to node B should now exist
  await expect(page.getByTestId('iwm-edge-1')).toBeVisible();
});
