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

  // Add edge node-0 → node-1 (defaults: aNodeId=nodes[0], zNodeId=nodes[1])
  await page.getByTestId('iwm-editor-link-add').click();

  // Add edge node-1 → node-2
  await page.getByTestId('iwm-editor-link-add').click();
  // Change A node from node-0 to node-1
  await page.getByTestId('iwm-editor-link-anode').fill('node-1');
  await page.getByRole('option', { name: 'node-1 (#2)' }).click();
  // Change Z node from node-1 to node-2
  await page.getByTestId('iwm-editor-link-znode').fill('node-2');
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
  // Defaults: aNodeId=nodes[0]=node-a, zNodeId=nodes[1]=node-b.
  await page.getByTestId('iwm-editor-link-add').click();

  // Edge 2 (A→B, index 1): same direction, receives a non-zero offset.
  await page.getByTestId('iwm-editor-link-add').click();

  // Edge 3 (B→A, index 2): reversed direction.
  // After the fix the offset sign is flipped vs edge 2,
  // so the two edges end up on opposite sides of the A-B axis.
  await page.getByTestId('iwm-editor-link-add').click();
  await page.getByTestId('iwm-editor-link-anode').fill('node-b');
  await page.getByRole('option', { name: 'node-b (#2)' }).click();
  await page.getByTestId('iwm-editor-link-znode').fill('node-a');
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

test('double-clicking a node opens inline editor and editing the name field renames the node', async ({
  panelEditPage,
  readProvisionedDataSource,
  page,
}) => {
  const ds = await readProvisionedDataSource({ fileName: 'datasources.yml' });
  await panelEditPage.datasource.set(ds.name);
  await panelEditPage.setVisualization('Interactive Network Weathermap');

  // Add a node
  await page.getByTestId('iwm-editor-node-add').click();
  await page.getByTestId('iwm-editor-node-name').fill('original-name');
  await expect(page.getByTestId('iwm-node-1')).toHaveText('original-name');

  // Double-click the node to open the inline editor
  await page.getByTestId('iwm-node-1').dblclick();
  const inlineEditor = page.getByTestId('iwm-inline-editor');
  await expect(inlineEditor).toBeVisible();
  await expect(inlineEditor.getByTestId('iwm-inline-editor-header')).toContainText('original-name (#1)');

  // Edit the name in the inline editor's name field
  const nameInput = inlineEditor.getByTestId('iwm-editor-node-name');
  await nameInput.fill('renamed-node');

  // The canvas label and inline editor title should reflect the new name
  await expect(page.getByTestId('iwm-node-1')).toHaveText('renamed-node');
  await expect(inlineEditor.getByTestId('iwm-inline-editor-header')).toContainText('renamed-node (#1)');
});

test('double-clicking a link opens inline editor with correct title', async ({
  panelEditPage,
  readProvisionedDataSource,
  page,
}) => {
  const ds = await readProvisionedDataSource({ fileName: 'datasources.yml' });
  await panelEditPage.datasource.set(ds.name);
  await panelEditPage.setVisualization('Interactive Network Weathermap');

  // Add two nodes with distinct positions
  await page.getByTestId('iwm-editor-node-add').click();
  await page.getByTestId('iwm-editor-node-name').fill('alpha');
  await page.getByTestId('iwm-editor-node-x').fill('100');
  await page.getByTestId('iwm-editor-node-y').fill('100');

  await page.getByTestId('iwm-editor-node-add').click();
  await page.getByTestId('iwm-editor-node-name').fill('beta');
  await page.getByTestId('iwm-editor-node-x').fill('400');
  await page.getByTestId('iwm-editor-node-y').fill('100');

  // Add a link between them
  await page.getByTestId('iwm-editor-link-add').click();
  await expect(page.getByTestId('iwm-edge-1')).toBeVisible();

  // Double-click the link to open the inline editor.
  // Click the center of the edge bounding box to land on a path element.
  const edgeBox = await page.getByTestId('iwm-edge-1').boundingBox();
  await page.mouse.dblclick(edgeBox!.x + edgeBox!.width / 2, edgeBox!.y + edgeBox!.height / 2);
  const inlineEditor = page.getByTestId('iwm-inline-editor');
  await expect(inlineEditor).toBeVisible();
  await expect(inlineEditor.getByTestId('iwm-inline-editor-header')).toContainText('alpha → beta (#1)');
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

test('direction combobox defaults to Egress and persists after switching queries', async ({
  panelEditPage,
  readProvisionedDataSource,
  page,
}) => {
  const ds = await readProvisionedDataSource({ fileName: 'datasources.yml' });
  await panelEditPage.datasource.set(ds.name);
  await panelEditPage.setVisualization('Interactive Network Weathermap');

  // Add first query config (linkTraffic, defaults to Egress)
  await page.getByTestId('iwm-editor-query-add').click();
  const directionBox = page.getByTestId('iwm-editor-query-direction');
  await expect(directionBox).toBeVisible();
  await expect(directionBox).toHaveValue('Egress');

  // Change direction to Ingress
  await directionBox.click();
  await page.getByRole('option', { name: 'Ingress' }).click();
  await expect(directionBox).toHaveValue('Ingress');

  // Add a second query config (should default to Egress)
  await page.getByTestId('iwm-editor-query-add').click();
  await expect(directionBox).toHaveValue('Egress');

  // Switch back to the first query via the selector combobox
  await page.getByPlaceholder('— select a query config —').click();
  await page.getByRole('option', { name: /link traffic \(#1\)/ }).click();

  // First query's direction should still be Ingress
  await expect(directionBox).toHaveValue('Ingress');
});

test('traffic label appears with egress direction and disappears with ingress', async ({
  panelEditPage,
  readProvisionedDataSource,
  page,
}) => {
  const ds = await readProvisionedDataSource({ fileName: 'datasources.yml' });

  // Mock query response: one series labeled instance=router-a, ifName=eth0 with 1 Gbps
  await panelEditPage.mockQueryDataResponse({
    results: {
      A: {
        frames: [
          {
            schema: {
              refId: 'A',
              fields: [
                { name: 'Time', type: 'time', typeInfo: { frame: 'time.Time' } },
                {
                  name: 'Value',
                  type: 'number',
                  typeInfo: { frame: 'float64' },
                  labels: { instance: 'router-a', ifName: 'eth0' },
                },
              ],
            },
            data: {
              values: [[Date.now() - 60_000, Date.now()], [1_000_000_000, 1_000_000_000]],
            },
          },
        ],
      },
    },
  });

  await panelEditPage.datasource.set(ds.name);
  await panelEditPage.setVisualization('Interactive Network Weathermap');

  // Add two nodes with distinct positions
  await page.getByTestId('iwm-editor-node-add').click();
  await page.getByTestId('iwm-editor-node-name').fill('router-a');
  await page.getByTestId('iwm-editor-node-x').fill('100');
  await page.getByTestId('iwm-editor-node-y').fill('100');

  await page.getByTestId('iwm-editor-node-add').click();
  await page.getByTestId('iwm-editor-node-name').fill('router-b');
  await page.getByTestId('iwm-editor-node-x').fill('400');
  await page.getByTestId('iwm-editor-node-y').fill('100');

  // Add a link; set A-iface=eth0 and Z-iface=eth1
  await page.getByTestId('iwm-editor-link-add').click();
  await page.getByTestId('iwm-editor-link-aiface').fill('eth0');
  await page.getByTestId('iwm-editor-link-ziface').fill('eth1');

  // Add a query config: refId A, linkTraffic, direction Egress (default)
  await page.getByTestId('iwm-editor-query-add').click();
  await page.getByTestId('iwm-editor-query-refid').click();
  await page.getByRole('option', { name: 'A' }).click();

  // Assign this query as the A→Z query on the link
  await page.getByTestId('iwm-editor-link-atoz-query').click();
  await page.getByRole('option', { name: 'A' }).click();

  // With direction=egress, the A-side labels (router-a, eth0) match → label visible
  await panelEditPage.refreshPanel();
  await expect(page.getByTestId('iwm-edge-1-atoz-label')).toBeVisible();
  await expect(page.getByTestId('iwm-edge-1-atoz-label')).toContainText(/1\.00\sG/);

  // Switch direction to Ingress: now Z-side labels (router-b, eth1) are used → no match
  await page.getByTestId('iwm-editor-query-direction').click();
  await page.getByRole('option', { name: 'Ingress' }).click();
  await panelEditPage.refreshPanel();
  await expect(page.getByTestId('iwm-edge-1-atoz-label')).not.toBeVisible();
});
