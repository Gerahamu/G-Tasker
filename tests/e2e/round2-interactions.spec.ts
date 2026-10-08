import { expect, test, type Page } from 'playwright/test';

async function prepareApp(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('gtasker-onboarding-done', 'true');
    localStorage.setItem('app-language', 'zh');
    localStorage.setItem('theme-mode', JSON.stringify('light'));
  });
}

async function createTask(page: Page, title: string) {
  await page.getByRole('button', { name: '新建任务', exact: true }).click();
  await page.getByPlaceholder('任务标题').fill(title);
  await page.getByRole('button', { name: '创建任务', exact: true }).click();
  await expect(page.locator('.task-row').filter({ hasText: title })).toHaveCount(1);
}

async function completeTask(page: Page, title: string) {
  const row = page.locator('.task-row').filter({ hasText: title });
  await row.locator('.task-check').click();
  await row.locator('.task-check').click();
  await expect(row.locator('.task-check')).toHaveClass(/bg-blue-500/);
}

test.beforeEach(async ({ page }) => {
  await prepareApp(page);
  await page.goto('/app/all');
});

test('task title double click edits in place without navigating first', async ({ page }) => {
  await createTask(page, '双击编辑原名');
  const row = page.locator('.task-row').first();
  await row.locator('.task-title').dblclick();
  await expect(page).toHaveURL(/\/app\/all$/);
  const input = row.getByRole('textbox', { name: '任务标题...' });
  await input.fill('双击编辑新名');
  await input.press('Enter');
  await expect(row).toContainText('双击编辑新名');
  await page.reload();
  await expect(page.locator('.task-row').filter({ hasText: '双击编辑新名' })).toHaveCount(1);
});

test('completion sinks, stale undo is ignored, and latest undo restores order', async ({
  page,
}) => {
  await createTask(page, '完成撤销甲');
  await createTask(page, '完成撤销乙');
  await completeTask(page, '完成撤销甲');
  await expect(page.locator('.task-list-section-label')).toContainText('已完成');

  const row = page.locator('.task-row').filter({ hasText: '完成撤销甲' });
  await row.locator('.task-check').click();
  await completeTask(page, '完成撤销甲');
  const undoButtons = page.getByRole('button', { name: '撤销', exact: true });
  await expect(undoButtons).toHaveCount(2);
  await undoButtons.first().click();
  await expect(row.locator('.task-check')).toHaveClass(/bg-blue-500/);
  await page.getByRole('button', { name: '撤销', exact: true }).click();
  await expect(row.locator('.task-check')).not.toHaveClass(/bg-blue-500/);

  const titles = await page.locator('.task-row .task-title').allTextContents();
  expect(titles.slice(0, 2)).toEqual(['完成撤销甲', '完成撤销乙']);
});

test('whole-row drag persists the new order without opening task detail', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Mouse drag persistence is covered by the desktop project.');
  await createTask(page, '拖拽甲');
  await createTask(page, '拖拽乙');
  await createTask(page, '拖拽丙');
  const first = page.locator('.task-sortable-row').filter({ hasText: '拖拽甲' });
  const third = page.locator('.task-sortable-row').filter({ hasText: '拖拽丙' });
  const firstBox = await first.boundingBox();
  const thirdBox = await third.boundingBox();
  if (!firstBox || !thirdBox) throw new Error('Task rows were not measurable');

  await page.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2 + 12, {
    steps: 3,
  });
  await page.waitForTimeout(80);
  await page.mouse.move(thirdBox.x + thirdBox.width / 2, thirdBox.y + thirdBox.height / 2, {
    steps: 8,
  });
  await page.waitForTimeout(120);
  await page.mouse.up();
  await expect
    .poll(async () => (await page.locator('.task-row .task-title').allTextContents()).slice(0, 3))
    .toEqual(['拖拽乙', '拖拽丙', '拖拽甲']);
  await expect(page).toHaveURL(/\/app\/all$/);
  await page.reload();
  await expect
    .poll(async () => (await page.locator('.task-row .task-title').allTextContents()).slice(0, 3))
    .toEqual(['拖拽乙', '拖拽丙', '拖拽甲']);
});

test('touch task rows preserve vertical pan behavior', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Touch scrolling is covered by the mobile project.');
  await createTask(page, '触摸滚动任务');
  const row = page.locator('.task-sortable-row').filter({ hasText: '触摸滚动任务' });
  await expect(row).toHaveCSS('touch-action', 'pan-y');
  await row.locator('.task-check').tap();
  await expect(row.locator('.task-check')).toHaveClass(/bg-gray-300/);
  await expect(page).toHaveURL(/\/app\/all$/);
});

test('subtasks support rapid entry, inline edit, completion sink, and undo', async ({ page }) => {
  await createTask(page, '子任务组合');
  const row = page.locator('.task-row').filter({ hasText: '子任务组合' });
  await row.locator('.task-disclosure').click();
  const composer = row.getByRole('textbox', { name: '添加子任务...' });

  await composer.fill('阅读');
  await composer.press('Enter');
  await expect(composer).toBeFocused();
  await composer.fill('数学');
  await composer.press('Enter');
  await expect(composer).toBeFocused();

  const reading = row.locator('.task-subtasks .sortable-row').first();
  await reading.getByText('阅读', { exact: true }).dblclick();
  const edit = reading.getByRole('textbox', { name: '标题' });
  await edit.fill('精读');
  await edit.press('Enter');
  await expect(reading).toContainText('精读');

  await reading.getByRole('button').click();
  await reading.getByRole('button').click();
  await expect(page.getByText('已完成：精读')).toBeVisible();
  await page.getByRole('button', { name: '撤销', exact: true }).click();
  await expect(row.locator('.sortable-row').filter({ hasText: '精读' })).toBeVisible();
});

test('context menu stays in viewport, consumes outside clicks, and delete dialog is keyboard safe', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Round 2 intentionally does not add a mobile long-press context menu.');
  await createTask(page, '右键安全任务');
  const row = page.locator('.task-row').filter({ hasText: '右键安全任务' });
  await row.click({ button: 'right', position: { x: 50, y: 20 } });
  const menu = page.getByRole('menu', { name: '右键安全任务' });
  await expect(menu).toBeVisible();
  const box = await menu.boundingBox();
  const viewport = page.viewportSize();
  expect(
    Boolean(box && viewport && box.x >= 0 && box.y >= 0 && box.x + box.width <= viewport.width),
  ).toBe(true);

  await page.mouse.click(5, 5);
  await expect(menu).toHaveCount(0);
  await expect(page).toHaveURL(/\/app\/all$/);

  await row.click({ button: 'right' });
  await page.getByRole('menuitem', { name: '删除任务', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: '取消', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(row).toBeVisible();
});
