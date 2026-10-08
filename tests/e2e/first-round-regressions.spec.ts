import { expect, test, type Page } from 'playwright/test';

async function prepareApp(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('gtasker-onboarding-done', 'true');
    localStorage.setItem('app-language', 'zh');
    localStorage.setItem('theme-mode', JSON.stringify('light'));
    localStorage.setItem('font-size', JSON.stringify('normal'));
  });
}

async function readTaskTitles(page: Page): Promise<string[]> {
  return page.evaluate(
    () =>
      new Promise<string[]>((resolve, reject) => {
        const request = indexedDB.open('TaskManagerDB');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const database = request.result;
          const query = database.transaction('tasks').objectStore('tasks').getAll();
          query.onerror = () => reject(query.error);
          query.onsuccess = () => {
            resolve(query.result.map((task) => task.title));
            database.close();
          };
        };
      }),
  );
}

function currentMonthDate(day: number): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

test.beforeEach(async ({ page }) => prepareApp(page));

test('synchronous submission guard prevents a double-created task', async ({ page }) => {
  await page.goto('/app/all');
  await page.getByRole('button', { name: '新建任务', exact: true }).click();
  await page.getByPlaceholder('任务标题').fill('双击只创建一次');
  const create = page.getByRole('button', { name: '创建任务', exact: true });
  await create.evaluate((button) => {
    button.click();
    button.click();
  });
  await expect(page.locator('.task-row').filter({ hasText: '双击只创建一次' })).toHaveCount(1);
});

test('completion can be cancelled before the delayed write and stays cancelled', async ({
  page,
}) => {
  await page.goto('/app/all');
  await page.getByRole('button', { name: '新建任务', exact: true }).click();
  await page.getByPlaceholder('任务标题').fill('立即取消完成');
  await page.getByRole('button', { name: '创建任务', exact: true }).click();

  const row = page.locator('.task-row').filter({ hasText: '立即取消完成' });
  const check = row.locator('.task-check');
  await check.click();
  await check.click();
  await expect(check).toHaveClass(/bg-blue-500/);
  await page.waitForTimeout(1800);
  await page.getByRole('button', { name: '撤销', exact: true }).click();
  await expect(check).not.toHaveClass(/bg-blue-500/);
  await page.reload();
  await expect(row.locator('.task-check')).not.toHaveClass(/bg-blue-500/);
});

test('a completed task remains detail-accessible and uses the shared delete dialog', async ({
  page,
}) => {
  await page.goto('/app/all');
  await page.getByRole('button', { name: '新建任务', exact: true }).click();
  await page.getByPlaceholder('任务标题').fill('已完成仍可删除');
  await page.getByRole('button', { name: '创建任务', exact: true }).click();

  const row = page.locator('.task-row').filter({ hasText: '已完成仍可删除' });
  await row.locator('.task-check').click();
  await row.locator('.task-check').click();
  await page.waitForTimeout(1700);
  await row.locator('.task-title').click();
  await page.getByRole('button', { name: '更多操作', exact: true }).click();
  await expect(page.getByRole('menuitem', { name: '删除任务', exact: true })).toBeVisible();

  await page.getByRole('menuitem', { name: '删除任务', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.getByRole('button', { name: '更多操作', exact: true }).click();
  await page.getByRole('menuitem', { name: '删除任务', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: '删除', exact: true }).click();
  await expect(page).toHaveURL(/\/app\/all$/);
  await expect(page.locator('.task-row').filter({ hasText: '已完成仍可删除' })).toHaveCount(0);
});

test('manual calendar country survives language changes', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('calendar-country', 'US'));
  await page.goto('/app/settings');
  const country = page.getByRole('combobox', { name: '日历默认节日地区' });
  await expect(country).toHaveValue('US');
  await page.getByRole('button', { name: '日本語', exact: true }).click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('calendar-country'))).toBe('US');
  await expect(page.getByRole('combobox', { name: 'カレンダー祝日' })).toHaveValue('US');
});

test('legacy tag route opens tags and retired inbox returns to today', async ({ page }) => {
  await page.goto('/app/tag/Alpha');
  await expect(page).toHaveURL(/\/app\/tags$/);
  await page.goto('/app/tags');
  await expect(page.getByRole('heading', { name: '标签' })).toBeVisible();
  await page.goto('/app/inbox');
  await expect(page).toHaveURL(/\/app\/today$/);
});

test('advanced date validation blocks reversed ranges and simple mode clears hidden fields', async ({
  page,
}) => {
  const laterDate = currentMonthDate(11);
  const earlierDate = currentMonthDate(10);
  await page.goto('/app/all');
  await page.getByRole('button', { name: '新建任务', exact: true }).click();
  const modal = page.getByRole('dialog', { name: '新建任务' });
  await modal.getByPlaceholder('任务标题').fill('日期模式归一化');
  await modal.getByRole('button', { name: '更多设置', exact: true }).click();
  await modal.getByRole('button', { name: '精确时间', exact: true }).click();

  await modal.getByRole('button', { name: '开始日期', exact: true }).click();
  await page
    .locator('.gt-picker-panel:popover-open')
    .getByRole('button', { name: laterDate, exact: true })
    .click();
  await modal.getByRole('button', { name: '结束日期', exact: true }).click();
  await page
    .locator('.gt-picker-panel:popover-open')
    .getByRole('button', { name: earlierDate, exact: true })
    .click();

  await modal.getByRole('button', { name: '创建任务', exact: true }).click();
  await expect(modal).toBeVisible();
  await expect(page.getByText('日期或时间无效；开始时间不能晚于结束时间。')).toBeVisible();

  await modal.getByRole('button', { name: '精确时间', exact: true }).click();
  await modal.getByRole('button', { name: '创建任务', exact: true }).click();
  await expect(modal).toHaveCount(0);
  const stored = await page.evaluate(
    () =>
      new Promise<Record<string, unknown>>((resolve, reject) => {
        const request = indexedDB.open('TaskManagerDB');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const database = request.result;
          const query = database.transaction('tasks').objectStore('tasks').getAll();
          query.onerror = () => reject(query.error);
          query.onsuccess = () => {
            const task = query.result.find((candidate) => candidate.title === '日期模式归一化');
            resolve(task);
            database.close();
          };
        };
      }),
  );
  expect(stored).toMatchObject({
    dateMode: 'simple',
    dateStart: null,
    dateEnd: null,
    dueDate: earlierDate,
  });
});

test('Clear All confirmation can be cancelled with Escape without changing data', async ({
  page,
}) => {
  await page.goto('/app/all');
  await page.getByRole('button', { name: '新建任务', exact: true }).click();
  await page.getByPlaceholder('任务标题').fill('取消清空后保留');
  await page.getByRole('button', { name: '创建任务', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '新建任务' })).toHaveCount(0);
  await expect(page.locator('.task-row').filter({ hasText: '取消清空后保留' })).toHaveCount(1);
  await expect.poll(() => readTaskTitles(page)).toContain('取消清空后保留');

  await page.goto('/app/settings');
  await page.getByRole('button', { name: '数据管理', exact: true }).click();
  await page.getByRole('button', { name: /清空所有数据/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await readTaskTitles(page)).toContain('取消清空后保留');
  await page.goto('/app/all');
  expect(await readTaskTitles(page)).toContain('取消清空后保留');
  await expect(page.locator('.task-row').filter({ hasText: '取消清空后保留' })).toHaveCount(1);
});
