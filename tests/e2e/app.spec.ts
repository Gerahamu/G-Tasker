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

test('loads primary routes without runtime errors', async ({ page }) => {
  const errors = collectRuntimeErrors(page);
  const routes = [
    ['/app/all', '全部任务'],
    ['/app/inbox', '灵感箱'],
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

test('first completion confirmation is mounted outside the task list', async ({ page }) => {
  await page.goto('/app/all');
  await page.getByRole('button', { name: '新建任务' }).click();
  await page.getByPlaceholder('任务标题').fill('发布前弹窗测试');
  await page.getByRole('button', { name: '创建任务', exact: true }).click();

  const taskRow = page.locator('.task-row').filter({ hasText: '发布前弹窗测试' });
  await expect(taskRow).toHaveCount(1);
  await taskRow.locator('.task-check').click();

  const modal = page.locator('.modal-backdrop');
  await expect(modal.getByRole('heading', { name: '确认完成任务' })).toBeVisible();
  await expect
    .poll(() => modal.evaluate((element) => element.parentElement === document.body))
    .toBe(true);

  const box = await modal.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(viewport!.width - 1);
  expect(box!.height).toBeGreaterThanOrEqual(viewport!.height - 1);

  await modal.getByRole('button', { name: '取消' }).click();
  await expect(modal).toHaveCount(0);
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
    await expect(page.getByRole('button', { name: '关闭导航' })).toBeVisible();
  }
});
