import { expect, test, type Page } from 'playwright/test';

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-06T08:30:00'));
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

async function openTaskDetails(page: Page, title: string) {
  await page.locator('.task-row').filter({ hasText: title }).locator('.task-title').click();
  await expect(page.getByRole('heading', { name: '任务属性' })).toBeVisible();
}

async function createTag(page: Page, tagName: string) {
  const picker = page.getByRole('dialog', { name: '选择标签' });
  await picker.getByRole('searchbox', { name: '搜索标签' }).fill(tagName);
  await picker.getByRole('button', { name: /^\+ 添加标签/ }).click();
  await expect(picker.getByRole('checkbox', { name: tagName })).toHaveAttribute(
    'aria-checked',
    'true',
  );
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

test('single-task tag management, deletion, list density, and reload persistence', async ({
  page,
}) => {
  await createTask(page, '标签管理验证');
  await openTaskDetails(page, '标签管理验证');
  await page.getByRole('button', { name: '+ 添加标签' }).click();
  const picker = page.getByRole('dialog', { name: '选择标签' });

  await createTag(page, 'Alpha');
  await createTag(page, 'Beta');
  await createTag(page, 'Gamma');
  await createTag(page, 'Delta');

  await picker.getByRole('button', { name: '重命名标签: Alpha' }).click();
  await picker.getByRole('textbox', { name: '重命名标签' }).fill('Alpha新版');
  await picker.getByRole('button', { name: '保存' }).click();
  await expect(picker.getByRole('checkbox', { name: 'Alpha新版' })).toHaveAttribute(
    'aria-checked',
    'true',
  );

  await picker.getByRole('button', { name: '删除标签: Beta' }).click();
  await picker.getByRole('button', { name: '删除', exact: true }).click();
  await expect(picker.getByRole('checkbox', { name: 'Beta' })).toHaveCount(0);
  await expect.poll(async () => (await readAll(page, 'taskTags')).length).toBe(3);
  await expect.poll(async () => (await readAll(page, 'tasks')).length).toBe(1);

  await page.keyboard.press('Escape');
  await page.locator('.task-detail-back').click();
  const row = page.locator('.task-row').filter({ hasText: '标签管理验证' });
  await expect(row.locator('.task-inline-tag')).toHaveCount(2);
  await expect(row.locator('.task-inline-tag-more')).toHaveText('+1');
  await expect(row).toContainText('Alpha新版');

  await page.reload();
  const reloadedRow = page.locator('.task-row').filter({ hasText: '标签管理验证' });
  await expect(reloadedRow.locator('.task-inline-tag-more')).toHaveText('+1');
  await expect(reloadedRow.locator('.task-inline-tag-more')).toHaveAttribute('title', 'Gamma');

  await openTaskDetails(page, '标签管理验证');
  await page.getByRole('button', { name: '+ 添加标签' }).click();
  const removePicker = page.getByRole('dialog', { name: '选择标签' });
  for (const name of ['Alpha新版', 'Delta', 'Gamma']) {
    const checkbox = removePicker.getByRole('checkbox', { name });
    await expect(checkbox).toHaveAttribute('aria-checked', 'true');
    await checkbox.click();
  }
  await expect.poll(async () => (await readAll(page, 'taskTags')).length).toBe(0);
  await expect.poll(async () => (await readAll(page, 'tasks')).length).toBe(1);
});

test('multi-select tag state fills partial assignments, removes all, and preserves other tags', async ({
  page,
}) => {
  await createTask(page, '批量标签甲');
  await createTask(page, '批量标签乙');
  await openTaskDetails(page, '批量标签甲');
  await page.getByRole('button', { name: '+ 添加标签' }).click();
  await createTag(page, '保留标签');
  await createTag(page, '共享标签');
  await page.keyboard.press('Escape');
  await page.locator('.task-detail-back').click();

  const first = page.locator('.task-row').filter({ hasText: '批量标签甲' });
  const second = page.locator('.task-row').filter({ hasText: '批量标签乙' });
  await first.locator('.task-check').click();
  await second.locator('.task-check').click();
  await expect(page.getByRole('toolbar', { name: '已选 2 项' })).toBeVisible();
  await page.getByRole('toolbar').getByRole('button', { name: '更多' }).click();
  await page
    .locator('.task-bulk-choices')
    .getByRole('button', { name: '标签', exact: true })
    .click();
  const picker = page.getByRole('dialog', { name: '选择标签' });

  const shared = picker.getByRole('checkbox', { name: '共享标签' });
  const keep = picker.getByRole('checkbox', { name: '保留标签' });
  await expect(shared).toHaveAttribute('aria-checked', 'mixed');
  await expect(keep).toHaveAttribute('aria-checked', 'mixed');
  await shared.click();
  await expect(shared).toHaveAttribute('aria-checked', 'true');
  await expect(keep).toHaveAttribute('aria-checked', 'mixed');
  await expect.poll(async () => (await readAll(page, 'taskTags')).length).toBe(3);

  await shared.click();
  await expect(shared).toHaveAttribute('aria-checked', 'false');
  await expect(keep).toHaveAttribute('aria-checked', 'mixed');
  await expect.poll(async () => (await readAll(page, 'taskTags')).length).toBe(1);
  await shared.click();
  await expect(shared).toHaveAttribute('aria-checked', 'true');
  await expect.poll(async () => (await readAll(page, 'taskTags')).length).toBe(3);

  await page.keyboard.press('Escape');
  await expect(page.getByRole('toolbar', { name: '已选 2 项' })).toBeVisible();
  await page.getByRole('button', { name: '退出多选' }).click();
  await expect(page.getByRole('toolbar')).toHaveCount(0);
  await expect(first).not.toHaveClass(/is-selected/);
  await expect.poll(async () => (await readAll(page, 'tasks')).length).toBe(2);

  await first.locator('.task-check').click();
  await second.locator('.task-check').click();
  await page.getByRole('toolbar').getByRole('button', { name: '完成' }).click();
  await expect(first.locator('.task-check')).toHaveClass(/bg-blue-500/);
  await expect(second.locator('.task-check')).toHaveClass(/bg-blue-500/);
  const relations = await readAll(page, 'taskTags');
  const tags = await readAll(page, 'tags');
  const sharedTagId = tags.find((tag) => tag.name === '共享标签')?.id;
  expect(relations).toHaveLength(3);
  expect(
    relations.filter((relation) => Number(relation.tagId) === Number(sharedTagId)),
  ).toHaveLength(2);
});
