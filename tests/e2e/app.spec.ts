import { expect, test, type Page } from 'playwright/test';

async function prepareApp(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('gtasker-onboarding-done', 'true');
    localStorage.setItem('app-language', 'zh');
    localStorage.setItem('theme-mode', JSON.stringify('light'));
    localStorage.setItem('font-size', JSON.stringify('normal'));
  });
}

function collectRuntimeErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}

test.beforeEach(async ({ page }) => {
  await prepareApp(page);
});

function currentMonthDate(day: number) {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

test('loads primary routes without runtime errors', async ({ page }) => {
  const errors = collectRuntimeErrors(page);
  const routes = [
    ['/app/all', '全部任务'],
    ['/app/memo', '备忘录'],
    ['/app/planning', '规划'],
    ['/app/calendar', '日历'],
    ['/app/clock', '时钟'],
    ['/app/settings', '设置'],
  ] as const;

  for (const [route, title] of routes) {
    await page.goto(route);
    await expect(page.locator('header').getByRole('heading', { name: title })).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
      )
      .toBe(true);
  }

  expect(errors).toEqual([]);
});

test('persists JSON-encoded appearance preferences', async ({ page }) => {
  await page.goto('/app/all');

  await expect
    .poll(() =>
      page.evaluate(() => ({
        dark: document.documentElement.classList.contains('dark'),
        normalFont: document.documentElement.classList.contains('font-scale-normal'),
      })),
    )
    .toEqual({ dark: false, normalFont: true });
});

test('task completion uses an inline two-step confirmation', async ({ page }) => {
  await page.goto('/app/all');
  await page.getByRole('button', { name: '新建任务' }).click();
  await page.getByPlaceholder('任务标题').fill('发布前弹窗测试');
  await page.getByRole('button', { name: '创建任务', exact: true }).click();

  const taskRow = page.locator('.task-row').filter({ hasText: '发布前弹窗测试' });
  await expect(taskRow).toHaveCount(1);
  const check = taskRow.locator('.task-check');
  await check.click();
  await expect(check).toHaveClass(/bg-gray-300/);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await check.click();
  await expect(check).toHaveClass(/bg-blue-500/);
  await page.reload();
  await expect(page.locator('.task-row').filter({ hasText: '发布前弹窗测试' }).locator('.task-check')).toHaveClass(/bg-blue-500/);
});

test('task expand trigger supports click and fine-pointer hover modes', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Hover expansion applies only to fine pointers.');
  await page.goto('/app/settings');
  const hoverMode = page.getByRole('button', { name: '悬停展开', exact: true });
  await expect(hoverMode).toHaveAttribute('aria-pressed', 'false');
  await hoverMode.click();
  await expect(hoverMode).toHaveAttribute('aria-pressed', 'true');
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('task-expand-trigger')))
    .toBe('"hover"');

  await page.goto('/app/all');
  await page.getByRole('button', { name: '新建任务' }).click();
  await page.getByPlaceholder('任务标题').fill('悬停展开测试');
  await page.getByRole('button', { name: '创建任务', exact: true }).click();

  const taskRow = page.locator('.task-row').filter({ hasText: '悬停展开测试' });
  const disclosure = taskRow.locator('.task-disclosure');
  const taskRowMain = taskRow.locator('.task-row-main');
  await expect(disclosure).toHaveAccessibleName('展开任务：悬停展开测试');
  await expect(disclosure).toHaveAttribute('aria-expanded', 'false');
  await taskRowMain.hover();
  await page.waitForTimeout(250);
  await expect(disclosure).toHaveAttribute('aria-expanded', 'false');
  await page.waitForTimeout(80);
  await expect(disclosure).toHaveAttribute('aria-expanded', 'true');
  await page.mouse.move(0, 0);
  await page.waitForTimeout(80);
  await taskRowMain.hover();
  await page.waitForTimeout(250);
  await expect(disclosure).toHaveAttribute('aria-expanded', 'true');
  await page.mouse.move(0, 0);
  await page.waitForTimeout(180);
  await expect(disclosure).toHaveAttribute('aria-expanded', 'false');

  await taskRowMain.hover();
  await page.waitForTimeout(100);
  await page.mouse.move(0, 0);
  await page.waitForTimeout(320);
  await expect(disclosure).toHaveAttribute('aria-expanded', 'false');
});

test('click expansion remains available without fine-pointer hover', async ({ page }) => {
  await page.goto('/app/all');
  await page.getByRole('button', { name: '新建任务' }).click();
  await page.getByPlaceholder('任务标题').fill('点击展开测试');
  await page.getByRole('button', { name: '创建任务', exact: true }).click();

  const taskRow = page.locator('.task-row').filter({ hasText: '点击展开测试' });
  const disclosure = taskRow.locator('.task-disclosure');
  await expect(disclosure).toHaveAttribute('aria-expanded', 'false');
  await disclosure.click();
  await expect(disclosure).toHaveAttribute('aria-expanded', 'true');
  await expect(disclosure).toHaveAccessibleName('收起任务：点击展开测试');
});

test('saving a new time mark closes the editor and its date detail', async ({ page }) => {
  const startDate = currentMonthDate(20);
  const endDate = currentMonthDate(28);
  await page.goto('/app/calendar');
  await page.locator('[data-ui="calendar-date"]').filter({ hasText: '20' }).first().click();
  await page.getByRole('button', { name: '+ 添加时间标注' }).click();
  const dialog = page.getByRole('dialog', { name: '时间标注' });
  await dialog.getByLabel('标题').fill('日本旅行');
  await dialog.getByLabel('开始日期').fill(startDate);
  await dialog.getByLabel('结束日期').fill(endDate);
  await dialog.getByRole('button', { name: '保存' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: '添加日期标记' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '日本旅行', exact: true })).toBeVisible();
});

test('cancelling a new time mark returns to its date detail', async ({ page }) => {
  await page.goto('/app/calendar');
  await page.locator('[data-ui="calendar-date"]').filter({ hasText: '20' }).first().click();
  await page.getByRole('button', { name: '+ 添加时间标注' }).click();
  const dialog = page.getByRole('dialog', { name: '时间标注' });
  await dialog.getByRole('button', { name: '取消' }).click();

  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: '添加日期标记' })).toBeVisible();
});

test('time mark bars use a centered fixed-height lane', async ({ page }) => {
  const startDate = currentMonthDate(20);
  const endDate = currentMonthDate(28);
  await page.goto('/app/calendar');
  await page.locator('[data-ui="calendar-date"]').filter({ hasText: '20' }).first().click();
  await page.getByRole('button', { name: '+ 添加时间标注' }).click();
  const dialog = page.getByRole('dialog', { name: '时间标注' });
  await dialog.getByLabel('标题').fill('Japanese Journal');
  await dialog.getByLabel('开始日期').fill(startDate);
  await dialog.getByLabel('结束日期').fill(endDate);
  await dialog.getByRole('button', { name: '保存' }).click();

  const bar = page.getByRole('button', { name: 'Japanese Journal', exact: true });
  await expect(bar).toBeVisible();
  await expect(bar).toHaveClass(/time-mark-bar/);
  await expect(bar).toHaveCSS('display', 'flex');
  await expect(bar).toHaveCSS('align-items', 'center');
  await expect(bar).toHaveCSS('white-space', 'nowrap');
});

test('overlapping time marks occupy separate lanes below the date header', async ({ page }) => {
  const startDate = currentMonthDate(20);
  const endDate = currentMonthDate(22);
  await page.goto('/app/calendar');

  for (const title of ['阶段一', '阶段二']) {
    await page.locator('[data-ui="calendar-date"]').filter({ hasText: '20' }).first().click();
    await page.getByRole('button', { name: '+ 添加时间标注' }).click();
    const dialog = page.getByRole('dialog', { name: '时间标注' });
    await dialog.getByLabel('标题').fill(title);
    await dialog.getByLabel('开始日期').fill(startDate);
    await dialog.getByLabel('结束日期').fill(endDate);
    await dialog.getByRole('button', { name: '保存' }).click();
  }

  const firstBar = page.getByRole('button', { name: '阶段一', exact: true });
  const secondBar = page.getByRole('button', { name: '阶段二', exact: true });
  const [firstTop, secondTop] = await Promise.all([
    firstBar.evaluate((element) => element.getBoundingClientRect().top),
    secondBar.evaluate((element) => element.getBoundingClientRect().top),
  ]);

  expect(secondTop).toBeGreaterThan(firstTop);
});

test('mobile layout stays within the viewport', async ({ page }) => {
  await page.goto('/app/all');
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    )
    .toBe(true);

  const openNavigation = page.getByRole('button', { name: '打开导航' });
  if (await openNavigation.isVisible()) {
    await openNavigation.click();
    await expect(page.getByRole('button', { name: '关闭导航', exact: true })).toBeVisible();
  }
});
