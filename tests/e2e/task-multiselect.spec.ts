import { expect, test, type Page } from 'playwright/test';

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-05T08:30:00'));
  await page.addInitScript(() => {
    localStorage.setItem('gtasker-onboarding-done', 'true');
    localStorage.setItem('app-language', 'zh');
    localStorage.setItem('theme-mode', JSON.stringify('light'));
  });
  await page.goto('/app/all');
  await expect(page.locator('[data-ui="startup-overlay"]')).toHaveCount(0);
});

async function createTask(page: Page, title: string) {
  await page.getByRole('button', { name: '新建任务', exact: true }).click();
  await page.getByPlaceholder('任务标题').fill(title);
  await page.getByRole('button', { name: '创建任务', exact: true }).click();
  await expect(page.locator('.task-row').filter({ hasText: title })).toHaveCount(1);
}

async function readAll(page: Page, storeName: string): Promise<Record<string, unknown>[]> {
  return page.evaluate(
    (name) =>
      new Promise<Record<string, unknown>[]>((resolve, reject) => {
        const request = indexedDB.open('TaskManagerDB');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const database = request.result;
          const query = database.transaction(name).objectStore(name).getAll();
          query.onerror = () => reject(query.error);
          query.onsuccess = () => {
            resolve(query.result);
            database.close();
          };
        };
      }),
    storeName,
  );
}

test('selects, cancels, exits, and preserves the single-task quick completion', async ({
  page,
}) => {
  await createTask(page, '多选甲');
  await createTask(page, '多选乙');
  const first = page.locator('.task-row').filter({ hasText: '多选甲' });
  const second = page.locator('.task-row').filter({ hasText: '多选乙' });

  await first.locator('.task-check').click();
  await expect(page.getByRole('toolbar')).toHaveCount(0);
  await expect(first).toHaveClass(/is-selected/);
  await second.locator('.task-check').click();
  await expect(page.getByRole('toolbar', { name: '已选 2 项' })).toBeVisible();
  await first.locator('.task-check').click();
  await expect(page.getByRole('toolbar')).toHaveCount(0);
  await second.locator('.task-title').dblclick();
  await expect(page.getByRole('toolbar')).toHaveCount(0);
  await expect(page).toHaveURL(/\/app\/all$/);
  await expect(second.locator('.task-title-input')).toHaveCount(0);

  await first.locator('.task-check').click();
  await expect(page.getByRole('toolbar')).toHaveCount(0);
  await expect(first).toHaveClass(/is-selected/);
  await page.keyboard.press('Escape');
  await expect(first).not.toHaveClass(/is-selected/);
  await expect(first.locator('.task-check')).not.toHaveClass(/bg-blue-500/);
  await first.locator('.task-check').click();
  await first.locator('.task-check').click();
  await expect(first.locator('.task-check')).toHaveClass(/bg-blue-500/);
  await page.reload();
  await expect(page.getByRole('toolbar')).toHaveCount(0);
  await expect(first.locator('.task-check')).toHaveClass(/bg-blue-500/);
});

test('does not complete the last task after shrinking a multi-selection', async ({ page }) => {
  await createTask(page, '连续多选甲');
  await createTask(page, '连续多选乙');
  await createTask(page, '连续多选丙');
  const first = page.locator('.task-row').filter({ hasText: '连续多选甲' });
  const second = page.locator('.task-row').filter({ hasText: '连续多选乙' });
  const third = page.locator('.task-row').filter({ hasText: '连续多选丙' });

  await first.locator('.task-check').click();
  await second.locator('.task-check').click();
  await third.locator('.task-check').click();
  await expect(page.getByRole('toolbar', { name: '已选 3 项' })).toBeVisible();

  await second.locator('.task-check').click();
  await third.locator('.task-check').click();
  await expect(page.getByRole('toolbar')).toHaveCount(0);
  await expect(first).toHaveClass(/is-selected/);

  await first.locator('.task-check').click();
  await expect(first).not.toHaveClass(/is-selected/);
  await expect(first.locator('.task-check')).not.toHaveClass(/bg-blue-500/);
  const tasks = await readAll(page, 'tasks');
  const remainingTask = tasks.find((task) => task.title === '连续多选甲');
  expect(remainingTask?.completedAt).toBeFalsy();
  expect(tasks).toHaveLength(3);
});

test('batch date, move, tag, complete, and delete keep persisted state consistent', async ({
  page,
}) => {
  await createTask(page, '批量甲');
  await createTask(page, '批量乙');
  const first = page.locator('.task-row').filter({ hasText: '批量甲' });
  const second = page.locator('.task-row').filter({ hasText: '批量乙' });
  const selectBoth = async () => {
    await first.locator('.task-check').click();
    await second.locator('.task-check').click();
    await expect(page.getByRole('toolbar', { name: '已选 2 项' })).toBeVisible();
  };

  await selectBoth();
  await page.getByRole('toolbar').getByRole('button', { name: '改时间' }).click();
  await page.getByLabel('截止日期', { exact: true }).fill('2026-10-10');
  await page.getByLabel('截止时间', { exact: true }).fill('14:30');
  await page.getByRole('button', { name: '应用' }).click();
  await expect(page.getByRole('toolbar')).toHaveCount(0);
  await expect
    .poll(async () =>
      (await readAll(page, 'tasks'))
        .filter((task) => ['批量甲', '批量乙'].includes(String(task.title)))
        .map((task) => task.dueDate),
    )
    .toEqual(['2026-10-10', '2026-10-10']);
  await expect
    .poll(async () =>
      (await readAll(page, 'tasks'))
        .filter((task) => ['批量甲', '批量乙'].includes(String(task.title)))
        .map((task) => task.dueTime),
    )
    .toEqual(['14:30', '14:30']);

  await selectBoth();
  await page.getByRole('toolbar').getByRole('button', { name: '改时间' }).click();
  await page.getByLabel('截止时间', { exact: true }).fill('16:45');
  await page.getByRole('button', { name: '应用' }).click();
  await expect
    .poll(async () =>
      (await readAll(page, 'tasks'))
        .filter((task) => ['批量甲', '批量乙'].includes(String(task.title)))
        .map((task) => [task.dueDate, task.dueTime]),
    )
    .toEqual([
      ['2026-10-10', '16:45'],
      ['2026-10-10', '16:45'],
    ]);

  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('TaskManagerDB');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const database = request.result;
          const tx = database.transaction('taskLists', 'readwrite');
          tx.objectStore('taskLists').add({
            name: '批量目标列表',
            color: '#3b82f6',
            icon: 'List',
            sortOrder: 99,
            isSmartList: false,
            filterConfig: null,
            createdAt: new Date().toISOString(),
          });
          tx.oncomplete = () => {
            database.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
  );

  await selectBoth();
  await page.getByRole('toolbar').getByRole('button', { name: '移动' }).click();
  await page.getByRole('button', { name: '批量目标列表' }).click();
  const targetList = (await readAll(page, 'taskLists')).find(
    (list) => list.name === '批量目标列表',
  );
  await expect
    .poll(async () =>
      (await readAll(page, 'tasks'))
        .filter((task) => ['批量甲', '批量乙'].includes(String(task.title)))
        .map((task) => task.listId),
    )
    .toEqual([targetList?.id, targetList?.id]);

  await selectBoth();
  await page.getByRole('toolbar').getByRole('button', { name: '更多' }).click();
  await page
    .locator('.task-bulk-choices')
    .getByRole('button', { name: '标签', exact: true })
    .click();
  const tagPicker = page.getByRole('dialog', { name: '选择标签' });
  await tagPicker.getByRole('searchbox', { name: '搜索标签' }).fill('批量标签');
  await tagPicker.getByRole('button', { name: /^\+ 添加标签/ }).click();
  await expect.poll(async () => (await readAll(page, 'taskTags')).length).toBe(2);
  await expect(tagPicker.getByRole('checkbox', { name: '批量标签' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await page.keyboard.press('Escape');
  await expect(page.getByRole('toolbar', { name: '已选 2 项' })).toBeVisible();
  await page.getByRole('button', { name: '退出多选' }).click();

  await selectBoth();
  await page.getByRole('toolbar').getByRole('button', { name: '更多' }).click();
  await page
    .locator('.task-bulk-choices')
    .getByRole('button', { name: '标签', exact: true })
    .click();
  const existingTagPicker = page.getByRole('dialog', { name: '选择标签' });
  await expect(existingTagPicker.getByRole('checkbox', { name: '批量标签' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await existingTagPicker.getByRole('checkbox', { name: '批量标签' }).click();
  await expect.poll(async () => (await readAll(page, 'taskTags')).length).toBe(0);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '退出多选' }).click();

  await selectBoth();
  await page.getByRole('toolbar').getByRole('button', { name: '完成' }).click();
  await expect(first.locator('.task-check')).toHaveClass(/bg-blue-500/);
  await expect(second.locator('.task-check')).toHaveClass(/bg-blue-500/);

  // A completed circle retains its existing one-click reopen action. Start
  // selection on an open task, then add completed tasks to the batch.
  await createTask(page, '选择入口');
  const entry = page.locator('.task-row').filter({ hasText: '选择入口' });
  await entry.locator('.task-check').click();
  await first.locator('.task-check').click();
  await second.locator('.task-check').click();
  await entry.locator('.task-check').click();
  await expect(page.getByRole('toolbar', { name: '已选 2 项' })).toBeVisible();
  await page.getByRole('toolbar').getByRole('button', { name: '更多' }).click();
  await page.getByRole('button', { name: '删除', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('2 个任务');
  await page.getByRole('dialog').getByRole('button', { name: '删除', exact: true }).click();
  await expect(first).toHaveCount(0);
  await expect(second).toHaveCount(0);
  await expect.poll(async () => (await readAll(page, 'taskTags')).length).toBe(0);
});
