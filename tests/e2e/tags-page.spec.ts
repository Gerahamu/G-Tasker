import { expect, test, type Page } from 'playwright/test';

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-06T08:30:00'));
  await page.addInitScript(() => {
    localStorage.setItem('gtasker-onboarding-done', 'true');
    localStorage.setItem('app-language', 'zh');
    localStorage.setItem('theme-mode', JSON.stringify('light'));
  });
  await page.goto('/app/all');
});

async function createTask(page: Page, title: string) {
  await page.getByRole('button', { name: '新建任务', exact: true }).click();
  await page.getByPlaceholder('任务标题').fill(title);
  await page.getByRole('button', { name: '创建任务', exact: true }).click();
  await expect(page.locator('.task-row').filter({ hasText: title })).toHaveCount(1);
}

async function addTag(page: Page, taskTitle: string, tagName: string) {
  await page.locator('.task-row').filter({ hasText: taskTitle }).locator('.task-title').click();
  await page.getByRole('button', { name: '+ 添加标签' }).click();
  const picker = page.getByRole('dialog', { name: '选择标签' });
  const checkbox = picker.getByRole('checkbox', { name: tagName });
  const existingTags = await readAll(page, 'tags');
  if (existingTags.some((tag) => tag.name === tagName)) {
    await expect(checkbox).toBeVisible();
    await checkbox.click();
  } else {
    await picker.getByRole('searchbox', { name: '搜索标签' }).fill(tagName);
    const createButton = picker.getByRole('button', { name: /^\+ 添加标签/ });
    await expect(createButton).toBeVisible();
    await createButton.click();
  }
  await page.keyboard.press('Escape');
  await page.locator('.task-detail-back').click();
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

async function clickSidebarToolItem(page: Page, label: string) {
  const item = page.locator('.sidebar-tools .sidebar-link').filter({ hasText: label });
  if (!(await item.isVisible())) {
    const sidebar = page.locator('.app-sidebar');
    const openNavigation = page.locator('.navbar-sidebar-toggle');
    if (await openNavigation.isVisible()) {
      await openNavigation.click();
      await expect(sidebar).toHaveClass(/is-open/);
    }
    const toolsSection = page
      .locator('.sidebar-collapsible-section')
      .filter({ has: page.locator('#sidebar-tools-heading') });
    const toolsToggle = toolsSection.locator('button.sidebar-section-toggle');
    if ((await toolsToggle.getAttribute('aria-expanded')) === 'false') await toolsToggle.click();
    await expect(item).toBeVisible();
  }
  await item.click();
}

async function openTagsOverview(page: Page) {
  await expect(
    page.locator('.sidebar-task-views').getByRole('button', { name: '标签' }),
  ).toHaveCount(0);
  await clickSidebarToolItem(page, '标签');
  await expect(
    page.locator('.sidebar-tools .sidebar-link').filter({ hasText: '标签' }),
  ).toHaveAttribute('aria-current', 'page');
}

async function returnToTagsOverview(page: Page) {
  await page.getByRole('banner').getByRole('button', { name: '标签' }).click();
}

test('tag overview counts, filters tasks, renames and deletes without deleting tasks', async ({
  page,
}) => {
  await createTask(page, '学校相关任务');
  await createTask(page, '另一个学校任务');
  await createTask(page, '未分类任务');
  await addTag(page, '学校相关任务', '学校');
  await addTag(page, '学校相关任务', '摄影');
  await addTag(page, '另一个学校任务', '学校');

  await openTagsOverview(page);
  const schoolRow = page.locator('.tags-page-row').filter({ hasText: '学校' });
  await expect(schoolRow).toContainText('2 个任务');
  await expect(page.locator('.tags-page-row').filter({ hasText: '摄影' })).toContainText(
    '1 个任务',
  );

  await schoolRow.locator('[data-ui="tag-overview-main"]').click();
  await expect(page.getByRole('heading', { name: '学校' })).toBeVisible();
  await expect(page.locator('.tags-page-detail-meta')).toHaveText('2 个任务');
  await expect(page.locator('.task-row').filter({ hasText: '学校相关任务' })).toHaveCount(1);
  await expect(page.locator('.task-row').filter({ hasText: '另一个学校任务' })).toHaveCount(1);
  await expect(page.locator('.task-row').filter({ hasText: '未分类任务' })).toHaveCount(0);

  await returnToTagsOverview(page);
  const schoolOverviewRow = page.locator('.tags-page-row').filter({ hasText: '学校' });
  await schoolOverviewRow.getByRole('button', { name: '更多操作: 学校' }).click();
  await page.getByRole('menuitem', { name: '重命名' }).click();
  const renameForm = page.locator('.tags-page-edit-form');
  await renameForm.locator('input').fill('学校新版');
  await renameForm.getByRole('button', { name: '确定' }).click();
  await expect(page.locator('.tags-page-row').filter({ hasText: '学校新版' })).toContainText(
    '2 个任务',
  );

  await page
    .locator('.tags-page-row')
    .filter({ hasText: '学校新版' })
    .getByRole('button', { name: '更多操作: 学校新版' })
    .click();
  await page.getByRole('menuitem', { name: '删除标签' }).click();
  const confirmation = page.getByRole('dialog', { name: '删除标签？' });
  await expect(confirmation).toContainText('任务本身会保留');
  await confirmation.getByRole('button', { name: '删除标签' }).click();
  await expect(page.locator('.tags-page-row').filter({ hasText: '学校新版' })).toHaveCount(0);
  await expect.poll(async () => (await readAll(page, 'tasks')).length).toBe(3);
  await expect.poll(async () => (await readAll(page, 'taskTags')).length).toBe(1);

  await page.reload();
  await expect(page.locator('.tags-page-row').filter({ hasText: '摄影' })).toContainText(
    '1 个任务',
  );
  await expect(page.locator('.tags-page-row').filter({ hasText: '学校新版' })).toHaveCount(0);
  await expect.poll(async () => (await readAll(page, 'tasks')).length).toBe(3);
});

test('create a standalone tag from the overview and persist its zero-task count', async ({
  page,
}) => {
  await page.goto('/app/tags');
  await expect(
    page.locator('.sidebar-tools .sidebar-link').filter({ hasText: '标签' }),
  ).toHaveAttribute('aria-current', 'page');
  await page.locator('[data-ui="create-tag-trigger"]').click();
  const input = page.getByRole('textbox', { name: '输入标签名称...' });
  await input.fill('稍后整理');
  await page.getByRole('button', { name: '确定', exact: true }).click();
  await expect(page.locator('.tags-page-row').filter({ hasText: '稍后整理' })).toContainText(
    '0 个任务',
  );

  await page.reload();
  await expect(page.locator('.tags-page-row').filter({ hasText: '稍后整理' })).toContainText(
    '0 个任务',
  );
});

test('bulk tag additions update the overview without replacing existing task tags', async ({
  page,
}) => {
  await createTask(page, '批量任务甲');
  await createTask(page, '批量任务乙');
  await addTag(page, '批量任务甲', '原有标签');

  await openTagsOverview(page);
  await page.locator('[data-ui="create-tag-trigger"]').click();
  await page.getByRole('textbox', { name: '输入标签名称...' }).fill('批量标签');
  await page.getByRole('button', { name: '确定', exact: true }).click();
  await expect(page.locator('.tags-page-row').filter({ hasText: '批量标签' })).toContainText(
    '0 个任务',
  );

  await page.goto('/app/all');
  await page.locator('.task-row').filter({ hasText: '批量任务甲' }).locator('.task-check').click();
  await page.locator('.task-row').filter({ hasText: '批量任务乙' }).locator('.task-check').click();
  const selectionToolbar = page.getByRole('toolbar', { name: '已选 2 项' });
  await selectionToolbar.getByRole('button', { name: /更多/ }).click();
  await page
    .locator('.task-bulk-choices')
    .getByRole('button', { name: '标签', exact: true })
    .click();
  const picker = page.getByRole('dialog', { name: '选择标签' });
  const bulkTag = picker.getByRole('checkbox', { name: '批量标签' });
  await expect(bulkTag).toHaveAttribute('aria-checked', 'false');
  await bulkTag.click();
  await expect(bulkTag).toHaveAttribute('aria-checked', 'true');
  await expect.poll(async () => (await readAll(page, 'taskTags')).length).toBe(3);

  await page.keyboard.press('Escape');
  await selectionToolbar.getByRole('button', { name: '退出多选' }).click();
  await page.goto('/app/tags');
  await expect(page.locator('.tags-page-row').filter({ hasText: '批量标签' })).toContainText(
    '2 个任务',
  );
  const tags = await readAll(page, 'tags');
  const originalTagId = tags.find((tag) => tag.name === '原有标签')?.id;
  const relations = await readAll(page, 'taskTags');
  expect(relations.filter((relation) => relation.tagId === originalTagId)).toHaveLength(1);
  expect(await readAll(page, 'tasks')).toHaveLength(2);
});
