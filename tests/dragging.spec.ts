import { expect, test } from '@grafana/plugin-e2e';
import type { Page } from '@playwright/test';
import type { XYPosition } from '@xyflow/react';

async function expectPosition(page: Page, { x, y }: XYPosition) {
  await expect(page.getByTestId('iwm-editor-node-x')).toHaveValue(String(x));
  await expect(page.getByTestId('iwm-editor-node-y')).toHaveValue(String(y));
  await expect(page.locator('.react-flow__node[data-id="1"]')).toHaveCSS('transform', `matrix(1, 0, 0, 1, ${x}, ${y})`);
}

async function startDrag(page: Page): Promise<XYPosition> {
  const handle = page.getByTestId('iwm-node-1').locator('.iwm-move-zone');
  const box = (await handle.boundingBox())!;
  const pointer = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.move(pointer.x, pointer.y);
  await page.mouse.down();
  // Cross React Flow's drag-start threshold before measuring subsequent movement.
  await page.mouse.move(pointer.x + 2, pointer.y);
  return { x: pointer.x + 2, y: pointer.y };
}

test.beforeEach(async ({ panelEditPage, readProvisionedDataSource, page }) => {
  const ds = await readProvisionedDataSource({ fileName: 'datasources.yml' });
  await panelEditPage.datasource.set(ds.name);
  await panelEditPage.setVisualization('Interactive Network Weathermap');

  // Leave enough canvas space to move vertically without triggering auto-pan.
  const separator = page.getByRole('separator', { name: 'Pane resize widget' }).first();
  const box = (await separator.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 200, { steps: 10 });
  await page.mouse.up();

  await page.getByTestId('iwm-editor-node-add').click();
  await page.getByTestId('iwm-editor-node-x').fill('100');
  await page.getByTestId('iwm-editor-node-y').fill('100');
  await expectPosition(page, { x: 100, y: 100 });
});

for (const { axis, origin, firstMove, laterMove, firstPosition, laterPosition } of [
  {
    axis: 'horizontal',
    origin: { x: 100, y: 100 },
    firstMove: { x: 63, y: 23 },
    laterMove: { x: 73, y: 103 },
    firstPosition: { x: 160, y: 100 },
    laterPosition: { x: 170, y: 100 },
  },
  {
    axis: 'vertical',
    origin: { x: 100, y: 100 },
    firstMove: { x: 23, y: 63 },
    laterMove: { x: 103, y: 73 },
    firstPosition: { x: 100, y: 160 },
    laterPosition: { x: 100, y: 170 },
  },
  {
    axis: 'horizontal, off-grid origin',
    origin: { x: 103, y: 107 },
    firstMove: { x: 63, y: 23 },
    laterMove: { x: 73, y: 103 },
    firstPosition: { x: 170, y: 107 },
    laterPosition: { x: 180, y: 107 },
  },
  {
    axis: 'vertical, off-grid origin',
    origin: { x: 103, y: 107 },
    firstMove: { x: 23, y: 63 },
    laterMove: { x: 103, y: 73 },
    firstPosition: { x: 103, y: 170 },
    laterPosition: { x: 103, y: 180 },
  },
]) {
  test(`Shift-drag keeps the initial axis (${axis})`, async ({ page }) => {
    await page.getByTestId('iwm-editor-node-x').fill(String(origin.x));
    await page.getByTestId('iwm-editor-node-y').fill(String(origin.y));
    await expectPosition(page, origin);

    await page.keyboard.down('Shift');
    const pointer = await startDrag(page);
    await page.mouse.move(pointer.x + firstMove.x, pointer.y + firstMove.y);
    await expectPosition(page, firstPosition);

    // Crossing the other axis must not change the axis chosen earlier.
    await page.mouse.move(pointer.x + laterMove.x, pointer.y + laterMove.y);
    await expectPosition(page, laterPosition);
    await page.mouse.up();
    await expectPosition(page, laterPosition);
    await page.keyboard.up('Shift');
  });
}

test('dragging without Shift snaps both coordinates to the grid', async ({ page }) => {
  const pointer = await startDrag(page);
  await page.mouse.move(pointer.x + 63, pointer.y + 23);
  await expectPosition(page, { x: 160, y: 120 });
  await page.mouse.up();
  await expectPosition(page, { x: 160, y: 120 });
});

test('releasing and pressing Shift again chooses a new axis from the drag origin', async ({ page }) => {
  await page.keyboard.down('Shift');
  const pointer = await startDrag(page);
  await page.mouse.move(pointer.x + 63, pointer.y + 23);
  await expectPosition(page, { x: 160, y: 100 });

  await page.keyboard.up('Shift');
  await page.mouse.move(pointer.x + 73, pointer.y + 103);
  await expectPosition(page, { x: 170, y: 200 });

  await page.keyboard.down('Shift');
  // This move is horizontal, but total displacement from the origin favors Y.
  await page.mouse.move(pointer.x + 83, pointer.y + 103);
  await expectPosition(page, { x: 100, y: 200 });
  await page.mouse.up();
  await expectPosition(page, { x: 100, y: 200 });

  // A new drag must choose its own axis and use its own starting position.
  const nextPointer = await startDrag(page);
  await page.mouse.move(nextPointer.x + 63, nextPointer.y + 23);
  await expectPosition(page, { x: 160, y: 200 });
  await page.mouse.up();
  await expectPosition(page, { x: 160, y: 200 });
  await page.keyboard.up('Shift');
});
