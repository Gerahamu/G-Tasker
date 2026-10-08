import { expect, test, type Page } from 'playwright/test';

async function prepareApp(page: Page, taskExpandTrigger: 'click' | 'hover' = 'click') {
  await page.addInitScript((trigger) => {
    localStorage.setItem('gtasker-onboarding-done', 'true');
    localStorage.setItem('app-language', 'zh');
    localStorage.setItem('theme-mode', JSON.stringify('light'));
    localStorage.setItem('task-expand-trigger', JSON.stringify(trigger));
  }, taskExpandTrigger);
}

async function createTask(page: Page, title: string) {
  await page.getByRole('button', { name: '新建任务', exact: true }).click();
  await page.getByPlaceholder('任务标题').fill(title);
  await page.getByRole('button', { name: '创建任务', exact: true }).click();
  await expect(page.locator('.task-row').filter({ hasText: title })).toHaveCount(1);
}

test('hover expansion waits 300ms and cancels pending work after pointer leave', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Hover expansion applies only to fine pointers.');
  await prepareApp(page, 'hover');
  await page.goto('/app/all');
  await createTask(page, '第三轮悬停延迟');

  const row = page.locator('.task-row').filter({ hasText: '第三轮悬停延迟' });
  const main = row.locator('.task-row-main');
  const disclosure = row.locator('.task-disclosure');

  await page.mouse.move(0, 0);
  await page.waitForTimeout(180);
  await main.hover();
  await page.waitForTimeout(250);
  await expect(disclosure).toHaveAttribute('aria-expanded', 'false');
  await page.mouse.move(0, 0);
  await page.waitForTimeout(100);
  await expect(disclosure).toHaveAttribute('aria-expanded', 'false');

  await main.hover();
  await page.waitForTimeout(320);
  await expect(disclosure).toHaveAttribute('aria-expanded', 'true');
});

test('drag uses a fixed-size overlay and leaves a stable source placeholder', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Mouse geometry is covered by desktop Chromium.');
  await prepareApp(page, 'hover');
  await page.goto('/app/all');
  for (const title of ['第三轮拖拽甲', '第三轮拖拽乙', '第三轮拖拽丙']) {
    await createTask(page, title);
  }

  const source = page.locator('.task-sortable-row').filter({ hasText: '第三轮拖拽甲' });
  const target = page.locator('.task-sortable-row').filter({ hasText: '第三轮拖拽丙' });
  const before = await source.boundingBox();
  const targetBox = await target.boundingBox();
  if (!before || !targetBox) throw new Error('Task rows were not measurable');

  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
  await page.mouse.down();
  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2 + 12, {
    steps: 3,
  });
  await page.waitForTimeout(80);

  const placeholder = await page.locator('.task-sortable-row[data-dragging="true"]').boundingBox();
  const overlay = page.locator('.sortable-drag-overlay');
  await expect(overlay).toHaveCount(1);
  const overlayBox = await overlay.boundingBox();
  expect(placeholder).not.toBeNull();
  expect(overlayBox).not.toBeNull();
  expect(Math.abs(placeholder!.width - before.width)).toBeLessThan(1);
  expect(Math.abs(placeholder!.height - before.height)).toBeLessThan(1);
  expect(Math.abs(overlayBox!.width - before.width)).toBeLessThan(1);
  expect(Math.abs(overlayBox!.height - before.height)).toBeLessThan(1);

  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, {
    steps: 8,
  });
  await page.waitForTimeout(180);
  const transformsAtRest = await page
    .locator('[data-sorting="true"] > .task-sortable-row')
    .evaluateAll((rows) => rows.map((row) => getComputedStyle(row).transform));
  await page.waitForTimeout(180);
  expect(
    await page
      .locator('[data-sorting="true"] > .task-sortable-row')
      .evaluateAll((rows) => rows.map((row) => getComputedStyle(row).transform)),
  ).toEqual(transformsAtRest);
  await page.mouse.up();
});

test('memo creation locks its background trigger without clearing the active draft', async ({
  page,
}) => {
  await prepareApp(page);
  await page.goto('/app/memo');

  const createTrigger = page.getByRole('button', { name: '新建备忘录', exact: true });
  await createTrigger.click();
  const title = page.getByPlaceholder('标题（可选，留空使用内容摘要）');
  const content = page.getByPlaceholder('写点什么...');
  await title.fill('Test Memo ABC');
  await content.fill('草稿内容不应丢失');

  await expect(createTrigger).toBeDisabled();
  await createTrigger.evaluate((button) => (button as HTMLButtonElement).click());
  await expect(title).toHaveValue('Test Memo ABC');
  await expect(content).toHaveValue('草稿内容不应丢失');

  await page.getByRole('button', { name: '取消', exact: true }).click();
  await expect(createTrigger).toBeEnabled();
  await createTrigger.click();
  await expect(title).toHaveValue('');

  await title.fill('Round 3 saved memo');
  await page.getByRole('button', { name: '创建', exact: true }).click();
  await expect(title).toHaveCount(0);
  await expect(createTrigger).toBeEnabled();
  await expect(page.locator('.memo-card').filter({ hasText: 'Round 3 saved memo' })).toHaveCount(1);
});
