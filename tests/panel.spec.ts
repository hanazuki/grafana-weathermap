import { expect, test } from '@grafana/plugin-e2e';

test('Add nodes and edges', async ({ panelEditPage, readProvisionedDataSource, page }) => {
  const ds = await readProvisionedDataSource({ fileName: 'datasources.yml' });
  await panelEditPage.datasource.set(ds.name);
  await panelEditPage.setVisualization('Interactive Network Weathermap');

  // Add 3 nodes with distinct positions so edges render
  await page.getByTestId('iwm-editor-node-add').click();
  await expect(page.getByTestId('iwm-node-1')).toContainText('#1');
  await page.getByTestId('iwm-editor-node-name').fill('node-0');
  await page.getByTestId('iwm-editor-node-x').fill('100');

  await page.getByTestId('iwm-editor-node-add').click();
  await expect(page.getByTestId('iwm-node-2')).toContainText('#2');
  await page.getByTestId('iwm-editor-node-name').fill('node-1');
  await page.getByTestId('iwm-editor-node-x').fill('300');

  await page.getByTestId('iwm-editor-node-add').click();
  await expect(page.getByTestId('iwm-node-3')).toContainText('#3');
  await page.getByTestId('iwm-editor-node-name').fill('node-2');
  await page.getByTestId('iwm-editor-node-x').fill('500');

  await expect(page.getByTestId('iwm-node-1')).toContainText('node-0');
  await expect(page.getByTestId('iwm-node-2')).toContainText('node-1');
  await expect(page.getByTestId('iwm-node-3')).toContainText('node-2');

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
  await expect(page.getByTestId('iwm-node-1')).toContainText('original-name');

  // Double-click the node to open the inline editor
  await page.getByTestId('iwm-node-1').dblclick();
  const inlineEditor = page.getByTestId('iwm-inline-editor');
  await expect(inlineEditor).toBeVisible();
  await expect(inlineEditor.getByTestId('iwm-inline-editor-header')).toContainText('original-name (#1)');

  // Edit the name in the inline editor's name field
  const nameInput = inlineEditor.getByTestId('iwm-editor-node-name');
  await nameInput.fill('renamed-node');

  // The canvas label and inline editor title should reflect the new name
  await expect(page.getByTestId('iwm-node-1')).toContainText('renamed-node');
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

test('Drag to connect creates a new link', async ({ panelEditPage, readProvisionedDataSource, page }) => {
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

  await expect(page.getByTestId('iwm-node-1')).toContainText('node-a');
  await expect(page.getByTestId('iwm-node-2')).toContainText('node-b');

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
              values: [
                [Date.now() - 60_000, Date.now()],
                [1_000_000_000, 1_000_000_000],
              ],
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
  await page.getByRole('option', { name: 'eth0' }).click();
  await page.getByTestId('iwm-editor-link-ziface').fill('eth1');
  await page.getByRole('option', { name: 'eth1' }).click();

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

test('delete button in inline editor removes a node and closes the editor', async ({
  panelEditPage,
  readProvisionedDataSource,
  page,
}) => {
  const ds = await readProvisionedDataSource({ fileName: 'datasources.yml' });
  await panelEditPage.datasource.set(ds.name);
  await panelEditPage.setVisualization('Interactive Network Weathermap');

  // Add a node
  await page.getByTestId('iwm-editor-node-add').click();
  await page.getByTestId('iwm-editor-node-name').fill('doomed-node');
  await expect(page.getByTestId('iwm-node-1')).toContainText('doomed-node');

  // The node inline editor is taller now and its delete button can overflow
  // below the panel canvas. Drag the pane separator down to give the canvas
  // enough room so the button is not intercepted.
  const separator = page.getByRole('separator', { name: 'Pane resize widget' }).first();
  const sepBox = await separator.boundingBox();
  await page.mouse.move(sepBox!.x + sepBox!.width / 2, sepBox!.y + sepBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(sepBox!.x + sepBox!.width / 2, sepBox!.y + sepBox!.height / 2 + 200, { steps: 10 });
  await page.mouse.up();

  // Double-click the node to open the inline editor
  await page.getByTestId('iwm-node-1').dblclick();
  const inlineEditor = page.getByTestId('iwm-inline-editor');
  await expect(inlineEditor).toBeVisible();

  // Click the delete button
  await inlineEditor.getByTestId('iwm-inline-editor-delete').click();

  // The inline editor should auto-close and the node should be gone
  await expect(inlineEditor).not.toBeVisible();
  await expect(page.getByTestId('iwm-node-1')).not.toBeVisible();
});

test('Reverse button in link inline editor swaps A and Z sides', async ({
  panelEditPage,
  readProvisionedDataSource,
  page,
}) => {
  // Mock a query frame so refId A is available in the query config editor
  await panelEditPage.mockQueryDataResponse({
    results: {
      A: {
        frames: [
          {
            schema: {
              refId: 'A',
              fields: [
                { name: 'Time', type: 'time', typeInfo: { frame: 'time.Time' } },
                { name: 'Value', type: 'number', typeInfo: { frame: 'float64' }, labels: {} },
              ],
            },
            data: { values: [[Date.now()], [0]] },
          },
        ],
      },
    },
  });

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

  // Add a link; set distinct interfaces on A and Z sides
  await page.getByTestId('iwm-editor-link-add').click();
  await page.getByTestId('iwm-editor-link-aiface').fill('eth0');
  await page.getByRole('option', { name: 'eth0' }).click();
  await page.getByTestId('iwm-editor-link-ziface').fill('eth1');
  await page.getByRole('option', { name: 'eth1' }).click();
  await expect(page.getByTestId('iwm-edge-1')).toBeVisible();

  // Add a linkTraffic query config with refId A and assign it to A→Z only.
  // Z→A is left unassigned (— none —). After Reverse the assignment flips.
  await page.getByTestId('iwm-editor-query-add').click();
  await page.getByTestId('iwm-editor-query-refid').click();
  await page.getByRole('option', { name: 'A' }).click();
  await page.getByTestId('iwm-editor-link-atoz-query').click();
  await page.getByRole('option', { name: 'A' }).click();

  // Drag the pane separator down to ensure the inline editor is fully visible
  const separator = page.getByRole('separator', { name: 'Pane resize widget' }).first();
  const sepBox = await separator.boundingBox();
  await page.mouse.move(sepBox!.x + sepBox!.width / 2, sepBox!.y + sepBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(sepBox!.x + sepBox!.width / 2, sepBox!.y + sepBox!.height / 2 + 200, { steps: 10 });
  await page.mouse.up();

  // Double-click the link to open the inline editor
  const edgeBox = await page.getByTestId('iwm-edge-1').boundingBox();
  await page.mouse.dblclick(edgeBox!.x + edgeBox!.width / 2, edgeBox!.y + edgeBox!.height / 2);
  const inlineEditor = page.getByTestId('iwm-inline-editor');
  await expect(inlineEditor).toBeVisible();

  // Verify initial state: nodes, interfaces, and query assignments
  await expect(inlineEditor.getByTestId('iwm-inline-editor-header')).toContainText('alpha → beta (#1)');
  await expect(inlineEditor.getByTestId('iwm-editor-link-anode')).toHaveValue('alpha (#1)');
  await expect(inlineEditor.getByTestId('iwm-editor-link-znode')).toHaveValue('beta (#2)');
  await expect(inlineEditor.getByTestId('iwm-editor-link-aiface')).toHaveValue('eth0');
  await expect(inlineEditor.getByTestId('iwm-editor-link-ziface')).toHaveValue('eth1');
  await expect(inlineEditor.getByTestId('iwm-editor-link-atoz-query')).toHaveValue('A');
  await expect(inlineEditor.getByTestId('iwm-editor-link-ztoa-query')).toHaveValue('— none —');

  // Click Reverse
  await inlineEditor.getByTestId('iwm-inline-editor-reverse').click();

  // Verify all A and Z fields have been swapped
  await expect(inlineEditor.getByTestId('iwm-inline-editor-header')).toContainText('beta → alpha (#1)');
  await expect(inlineEditor.getByTestId('iwm-editor-link-anode')).toHaveValue('beta (#2)');
  await expect(inlineEditor.getByTestId('iwm-editor-link-znode')).toHaveValue('alpha (#1)');
  await expect(inlineEditor.getByTestId('iwm-editor-link-aiface')).toHaveValue('eth1');
  await expect(inlineEditor.getByTestId('iwm-editor-link-ziface')).toHaveValue('eth0');
  await expect(inlineEditor.getByTestId('iwm-editor-link-atoz-query')).toHaveValue('— none —');
  await expect(inlineEditor.getByTestId('iwm-editor-link-ztoa-query')).toHaveValue('A');
});

test('delete button in inline editor removes a link and closes the editor', async ({
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

  // The link inline editor is taller than the node editor and its delete button can overflow
  // below the panel canvas into the query-editor pane. Drag the pane separator down to give
  // the canvas enough room so the button is not intercepted.
  const separator = page.getByRole('separator', { name: 'Pane resize widget' }).first();
  const sepBox = await separator.boundingBox();
  await page.mouse.move(sepBox!.x + sepBox!.width / 2, sepBox!.y + sepBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(sepBox!.x + sepBox!.width / 2, sepBox!.y + sepBox!.height / 2 + 200, { steps: 10 });
  await page.mouse.up();

  // Double-click the link to open the inline editor
  const edgeBox = await page.getByTestId('iwm-edge-1').boundingBox();
  await page.mouse.dblclick(edgeBox!.x + edgeBox!.width / 2, edgeBox!.y + edgeBox!.height / 2);
  const inlineEditor = page.getByTestId('iwm-inline-editor');
  await expect(inlineEditor).toBeVisible();
  await expect(inlineEditor.getByTestId('iwm-inline-editor-header')).toContainText('alpha → beta (#1)');

  // Click the delete button
  await inlineEditor.getByTestId('iwm-inline-editor-delete').click();

  // The inline editor should auto-close and the link should be gone
  await expect(inlineEditor).not.toBeVisible();
  await expect(page.getByTestId('iwm-edge-1')).not.toBeVisible();
});

test('node description appears in node popup', async ({ panelEditPage, readProvisionedDataSource, page }) => {
  const ds = await readProvisionedDataSource({ fileName: 'datasources.yml' });
  await panelEditPage.datasource.set(ds.name);
  await panelEditPage.setVisualization('Interactive Network Weathermap');

  // Add a node with a description
  await page.getByTestId('iwm-editor-node-add').click();
  await page.getByTestId('iwm-editor-node-x').fill('200');
  await page.getByTestId('iwm-editor-node-y').fill('200');
  await page.getByTestId('iwm-editor-node-description').fill('Core router');
  await page.getByTestId('iwm-editor-node-name').fill('router-a');
  await expect(page.getByTestId('iwm-node-1')).toContainText('router-a');

  // Click the node to open the pinned popup
  await page.getByTestId('iwm-node-1').click();

  // Assert the popup is visible and contains the description
  const popup = page.getByTestId('iwm-node-popup');
  await expect(popup).toBeVisible();
  await expect(popup).toContainText('Core router');
});

test('link description appears in hover popup', async ({ panelEditPage, readProvisionedDataSource, page }) => {
  const ds = await readProvisionedDataSource({ fileName: 'datasources.yml' });
  await panelEditPage.datasource.set(ds.name);
  await panelEditPage.setVisualization('Interactive Network Weathermap');

  // Add two nodes at distinct positions
  await page.getByTestId('iwm-editor-node-add').click();
  await page.getByTestId('iwm-editor-node-name').fill('alpha');
  await page.getByTestId('iwm-editor-node-x').fill('100');
  await page.getByTestId('iwm-editor-node-y').fill('100');

  await page.getByTestId('iwm-editor-node-add').click();
  await page.getByTestId('iwm-editor-node-name').fill('beta');
  await page.getByTestId('iwm-editor-node-x').fill('400');
  await page.getByTestId('iwm-editor-node-y').fill('100');

  // Add a link and set a description
  await page.getByTestId('iwm-editor-link-add').click();
  await page.getByTestId('iwm-editor-link-description').fill('Uplink to AS12345');
  await expect(page.getByTestId('iwm-edge-1')).toBeVisible();

  // Hover over the center of the edge to trigger the preview popup
  const edgeBox = await page.getByTestId('iwm-edge-1').boundingBox();
  await page.mouse.move(edgeBox!.x + edgeBox!.width / 2, edgeBox!.y + edgeBox!.height / 2);

  // Assert the popup is visible and contains the description
  const popup = page.getByTestId('iwm-link-popup');
  await expect(popup).toBeVisible();
  await expect(popup).toContainText('Uplink to AS12345');
});

test('interface combobox shows suggestions from query data (sidebar editor path)', async ({
  panelEditPage,
  readProvisionedDataSource,
  page,
}) => {
  const ds = await readProvisionedDataSource({ fileName: 'datasources.yml' });

  // Mock query response: router-a has eth0 and eth1; router-b has eth2
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
                {
                  name: 'Value',
                  type: 'number',
                  typeInfo: { frame: 'float64' },
                  labels: { instance: 'router-a', ifName: 'eth1' },
                },
                {
                  name: 'Value',
                  type: 'number',
                  typeInfo: { frame: 'float64' },
                  labels: { instance: 'router-b', ifName: 'eth2' },
                },
              ],
            },
            data: {
              values: [[Date.now()], [1_000_000_000], [2_000_000_000], [3_000_000_000]],
            },
          },
        ],
      },
    },
  });

  await panelEditPage.datasource.set(ds.name);
  await panelEditPage.setVisualization('Interactive Network Weathermap');

  // Add two nodes
  await page.getByTestId('iwm-editor-node-add').click();
  await page.getByTestId('iwm-editor-node-name').fill('router-a');
  await page.getByTestId('iwm-editor-node-x').fill('100');
  await page.getByTestId('iwm-editor-node-y').fill('100');

  await page.getByTestId('iwm-editor-node-add').click();
  await page.getByTestId('iwm-editor-node-name').fill('router-b');
  await page.getByTestId('iwm-editor-node-x').fill('400');
  await page.getByTestId('iwm-editor-node-y').fill('100');

  // Add a linkTraffic query config with refId A, direction Egress (src labels → A node)
  await page.getByTestId('iwm-editor-query-add').click();
  await page.getByTestId('iwm-editor-query-refid').click();
  await page.getByRole('option', { name: 'A' }).click();

  // Add a link and assign the query as A→Z
  await page.getByTestId('iwm-editor-link-add').click();
  await page.getByTestId('iwm-editor-link-atoz-query').click();
  await page.getByRole('option', { name: 'A' }).click();

  // Refresh so context.data is populated with the mocked frames before checking suggestions
  await panelEditPage.refreshPanel();

  // Open the A-iface combobox — should show eth0 and eth1 (router-a's interfaces)
  await page.getByTestId('iwm-editor-link-aiface').click();
  await expect(page.getByRole('option', { name: 'eth0' })).toBeVisible();
  await expect(page.getByRole('option', { name: 'eth1' })).toBeVisible();
  await page.keyboard.press('Escape');

  // Open the Z-iface combobox — should show eth2 (router-b, ingress from A→Z query)
  // A→Z with direction Egress uses src (A-side) labels, so for Z-iface we need ingress or ztoa
  // No ztoa query assigned, so Z-iface gets no suggestions
  await page.getByTestId('iwm-editor-link-ziface').click();
  await page.keyboard.press('Escape');
});

test('interface combobox accepts custom value not in suggestions', async ({
  panelEditPage,
  readProvisionedDataSource,
  page,
}) => {
  const ds = await readProvisionedDataSource({ fileName: 'datasources.yml' });
  await panelEditPage.datasource.set(ds.name);
  await panelEditPage.setVisualization('Interactive Network Weathermap');

  await page.getByTestId('iwm-editor-node-add').click();
  await page.getByTestId('iwm-editor-node-name').fill('router-a');
  await page.getByTestId('iwm-editor-node-x').fill('100');
  await page.getByTestId('iwm-editor-node-y').fill('100');

  await page.getByTestId('iwm-editor-node-add').click();
  await page.getByTestId('iwm-editor-node-name').fill('router-b');
  await page.getByTestId('iwm-editor-node-x').fill('400');
  await page.getByTestId('iwm-editor-node-y').fill('100');

  await page.getByTestId('iwm-editor-link-add').click();

  // Type a custom interface name not present in any suggestions and select the create option
  await page.getByTestId('iwm-editor-link-aiface').fill('lo0');
  await page.getByRole('option', { name: 'lo0' }).click();

  // The field should retain the typed value
  await expect(page.getByTestId('iwm-editor-link-aiface')).toHaveValue('lo0');
});

test('interface suggestions appear via the inline editor path', async ({
  panelEditPage,
  readProvisionedDataSource,
  page,
}) => {
  const ds = await readProvisionedDataSource({ fileName: 'datasources.yml' });

  // Mock query response: router-a has eth0
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
            data: { values: [[Date.now()], [1_000_000_000]] },
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

  // Add a linkTraffic query config with refId A, direction Egress
  await page.getByTestId('iwm-editor-query-add').click();
  await page.getByTestId('iwm-editor-query-refid').click();
  await page.getByRole('option', { name: 'A' }).click();

  // Add a link and assign the A→Z query
  await page.getByTestId('iwm-editor-link-add').click();
  await page.getByTestId('iwm-editor-link-atoz-query').click();
  await page.getByRole('option', { name: 'A' }).click();
  await expect(page.getByTestId('iwm-edge-1')).toBeVisible();

  // Refresh so context.data is populated with the mocked frames before checking suggestions
  await panelEditPage.refreshPanel();

  // Drag the pane separator down to give the canvas enough room
  const separator = page.getByRole('separator', { name: 'Pane resize widget' }).first();
  const sepBox = await separator.boundingBox();
  await page.mouse.move(sepBox!.x + sepBox!.width / 2, sepBox!.y + sepBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(sepBox!.x + sepBox!.width / 2, sepBox!.y + sepBox!.height / 2 + 200, { steps: 10 });
  await page.mouse.up();

  // Double-click the link to open the inline editor
  const edgeBox = await page.getByTestId('iwm-edge-1').boundingBox();
  await page.mouse.dblclick(edgeBox!.x + edgeBox!.width / 2, edgeBox!.y + edgeBox!.height / 2);
  const inlineEditor = page.getByTestId('iwm-inline-editor');
  await expect(inlineEditor).toBeVisible();

  // Open the A-iface combobox in the inline editor — eth0 should appear as a suggestion
  await inlineEditor.getByTestId('iwm-editor-link-aiface').click();
  await expect(page.getByRole('option', { name: 'eth0' })).toBeVisible();
  await page.keyboard.press('Escape');
});

test('linkTraffic label comboboxes show suggestions from query data', async ({
  panelEditPage,
  readProvisionedDataSource,
  page,
}) => {
  const ds = await readProvisionedDataSource({ fileName: 'datasources.yml' });

  // Mock a query response with known label keys: instance and ifName
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
            data: { values: [[Date.now()], [1_000_000_000]] },
          },
        ],
      },
    },
  });

  await panelEditPage.datasource.set(ds.name);
  await panelEditPage.setVisualization('Interactive Network Weathermap');

  // Add a linkTraffic query config with refId A
  await page.getByTestId('iwm-editor-query-add').click();
  await page.getByTestId('iwm-editor-query-refid').click();
  await page.getByRole('option', { name: 'A' }).click();

  // Refresh so context.data is populated with the mocked frames
  await panelEditPage.refreshPanel();

  // Open the instance label combobox — should show 'ifName' and 'instance' as options
  await page.getByTestId('iwm-editor-query-instance-label').click();
  await expect(page.getByRole('option', { name: 'ifName' })).toBeVisible();
  await expect(page.getByRole('option', { name: 'instance' })).toBeVisible();
  await page.keyboard.press('Escape');

  // Open the interface label combobox — should show the same keys
  await page.getByTestId('iwm-editor-query-interface-label').click();
  await expect(page.getByRole('option', { name: 'ifName' })).toBeVisible();
  await expect(page.getByRole('option', { name: 'instance' })).toBeVisible();
  await page.keyboard.press('Escape');
});

test('instance label combobox accepts custom value not in suggestions', async ({
  panelEditPage,
  readProvisionedDataSource,
  page,
}) => {
  const ds = await readProvisionedDataSource({ fileName: 'datasources.yml' });
  await panelEditPage.datasource.set(ds.name);
  await panelEditPage.setVisualization('Interactive Network Weathermap');

  // Add a linkTraffic query config (no mock data — no suggestions available)
  await page.getByTestId('iwm-editor-query-add').click();

  // Type a custom label key not present in any suggestions and select the create option
  await page.getByTestId('iwm-editor-query-instance-label').fill('custom_label');
  await page.getByRole('option', { name: 'custom_label' }).click();

  // The field should retain the typed value
  await expect(page.getByTestId('iwm-editor-query-instance-label')).toHaveValue('custom_label');
});

test('interface description appears in A iface combobox via inline editor', async ({
  panelEditPage,
  readProvisionedDataSource,
  page,
}) => {
  const ds = await readProvisionedDataSource({ fileName: 'datasources.yml' });

  // Mock query response: router-a/eth0 with ifAlias label
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
                  labels: { instance: 'router-a', ifName: 'eth0', ifAlias: 'Uplink to core' },
                },
              ],
            },
            data: { values: [[Date.now()], [1_000_000_000]] },
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

  // Add a linkTraffic query config with refId A, direction Egress (descriptionLabel defaults to 'ifAlias')
  await page.getByTestId('iwm-editor-query-add').click();
  await page.getByTestId('iwm-editor-query-refid').click();
  await page.getByRole('option', { name: 'A' }).click();

  // Add a link and assign the A→Z query
  await page.getByTestId('iwm-editor-link-add').click();
  await page.getByTestId('iwm-editor-link-atoz-query').click();
  await page.getByRole('option', { name: 'A' }).click();
  await expect(page.getByTestId('iwm-edge-1')).toBeVisible();

  await panelEditPage.refreshPanel();

  // Drag the pane separator down to give the canvas enough room
  const separator = page.getByRole('separator', { name: 'Pane resize widget' }).first();
  const sepBox = await separator.boundingBox();
  await page.mouse.move(sepBox!.x + sepBox!.width / 2, sepBox!.y + sepBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(sepBox!.x + sepBox!.width / 2, sepBox!.y + sepBox!.height / 2 + 200, { steps: 10 });
  await page.mouse.up();

  // Double-click the link to open the inline editor
  const edgeBox = await page.getByTestId('iwm-edge-1').boundingBox();
  await page.mouse.dblclick(edgeBox!.x + edgeBox!.width / 2, edgeBox!.y + edgeBox!.height / 2);
  const inlineEditor = page.getByTestId('iwm-inline-editor');
  await expect(inlineEditor).toBeVisible();

  // Open the A iface combobox and assert eth0 option with description text is visible
  await inlineEditor.getByTestId('iwm-editor-link-aiface').click();
  await expect(page.getByRole('option', { name: 'eth0' })).toBeVisible();
  await expect(page.getByText('Uplink to core')).toBeVisible();
  await page.keyboard.press('Escape');
});

test('traffic labels are rendered above arrows via EdgeLabelRenderer', async ({
  panelEditPage,
  readProvisionedDataSource,
  page,
}) => {
  const ds = await readProvisionedDataSource({ fileName: 'datasources.yml' });

  // Mock query response: node-a/eth0 with 500 Mbps
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
                  labels: { instance: 'node-a', ifName: 'eth0' },
                },
              ],
            },
            data: {
              values: [
                [Date.now() - 60_000, Date.now()],
                [500_000_000, 500_000_000],
              ],
            },
          },
        ],
      },
    },
  });

  await panelEditPage.datasource.set(ds.name);
  await panelEditPage.setVisualization('Interactive Network Weathermap');

  // Add two nodes
  await page.getByTestId('iwm-editor-node-add').click();
  await page.getByTestId('iwm-editor-node-name').fill('node-a');
  await page.getByTestId('iwm-editor-node-x').fill('100');
  await page.getByTestId('iwm-editor-node-y').fill('150');

  await page.getByTestId('iwm-editor-node-add').click();
  await page.getByTestId('iwm-editor-node-name').fill('node-b');
  await page.getByTestId('iwm-editor-node-x').fill('400');
  await page.getByTestId('iwm-editor-node-y').fill('150');

  // Add a link with matching interface names
  await page.getByTestId('iwm-editor-link-add').click();
  await page.getByTestId('iwm-editor-link-aiface').fill('eth0');
  await page.getByRole('option', { name: 'eth0' }).click();
  await page.getByTestId('iwm-editor-link-ziface').fill('eth0');
  await page.getByRole('option', { name: 'eth0' }).click();

  // Add a linkTraffic query config with refId A, direction Egress (default)
  await page.getByTestId('iwm-editor-query-add').click();
  await page.getByTestId('iwm-editor-query-refid').click();
  await page.getByRole('option', { name: 'A' }).click();

  // Assign query as A→Z traffic on the link
  await page.getByTestId('iwm-editor-link-atoz-query').click();
  await page.getByRole('option', { name: 'A' }).click();

  await panelEditPage.refreshPanel();

  // The A→Z label must be visible as an HTML element rendered via EdgeLabelRenderer
  await expect(page.getByTestId('iwm-edge-1-atoz-label')).toBeVisible();
});

test('nodeHealth instance label combobox shows suggestions from query data', async ({
  panelEditPage,
  readProvisionedDataSource,
  page,
}) => {
  const ds = await readProvisionedDataSource({ fileName: 'datasources.yml' });

  // Mock a query response with known label key: instance
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
                  labels: { instance: 'host-1' },
                },
              ],
            },
            data: { values: [[Date.now()], [1]] },
          },
        ],
      },
    },
  });

  await panelEditPage.datasource.set(ds.name);
  await panelEditPage.setVisualization('Interactive Network Weathermap');

  // Add a nodeHealth query config with refId A
  await page.getByTestId('iwm-editor-query-add').click();
  await page.getByTestId('iwm-editor-query-refid').click();
  await page.getByRole('option', { name: 'A' }).click();
  await page.getByTestId('iwm-editor-query-type').click();
  await page.getByRole('option', { name: 'node health' }).click();

  // Refresh so context.data is populated with the mocked frames
  await panelEditPage.refreshPanel();

  // Open the instance label combobox — should show 'instance' as an option
  await page.getByTestId('iwm-editor-query-instance-label').click();
  await expect(page.getByRole('option', { name: 'instance' })).toBeVisible();
  // Interface label field should not be present for nodeHealth
  await expect(page.getByTestId('iwm-editor-query-interface-label')).not.toBeVisible();
  await page.keyboard.press('Escape');
});
