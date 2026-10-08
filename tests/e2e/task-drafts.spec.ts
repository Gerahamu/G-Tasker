import { expect, test, type Page } from 'playwright/test';

async function prepareApp(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('gtasker-onboarding-done', 'true');
    localStorage.setItem('app-language', 'zh');
    localStorage.setItem('theme-mode', JSON.stringify('light'));
  });
}

async function openCreateTask(page: Page) {
  await page.getByRole('button', { name: '新建任务', exact: true }).click();
  return page.getByRole('dialog', { name: '新建任务' });
}

async function readTable(page: Page, tableName: string): Promise<Record<string, unknown>[]> {
  return page.evaluate(
    ({ tableName }) =>
      new Promise<Record<string, unknown>[]>((resolve, reject) => {
        const request = indexedDB.open('TaskManagerDB');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const database = request.result;
          const query = database.transaction(tableName).objectStore(tableName).getAll();
          query.onerror = () => reject(query.error);
          query.onsuccess = () => {
            resolve(query.result);
            database.close();
          };
        };
      }),
    { tableName },
  );
}

test.beforeEach(async ({ page }) => {
  await prepareApp(page);
  await page.goto('/app/all');
});

test('save draft is disabled until a trimmed title exists and never creates a task row', async ({
  page,
}) => {
  const modal = await openCreateTask(page);
  const title = modal.getByPlaceholder('任务标题');
  const saveDraft = modal.getByRole('button', { name: '存草稿', exact: true });

  await expect(saveDraft).toBeDisabled();
  await title.fill('     ');
  await expect(saveDraft).toBeDisabled();
  await saveDraft.evaluate((button) => (button as HTMLButtonElement).click());
  expect(await readTable(page, 'taskDrafts')).toHaveLength(0);
  expect(await readTable(page, 'tasks')).toHaveLength(0);

  await title.fill('Persistent Draft');
  await expect(saveDraft).toBeEnabled();
  await saveDraft.click();
  await expect(modal).toHaveCount(0);
  expect(await readTable(page, 'taskDrafts')).toHaveLength(1);
  expect(await readTable(page, 'tasks')).toHaveLength(0);
});

test('a saved draft survives reload, hydrates the form, remains editable and creates a new task', async ({
  page,
}) => {
  let modal = await openCreateTask(page);
  await modal.getByPlaceholder('任务标题').fill('Draft A');
  const description = modal.getByRole('textbox', { name: '简介', exact: true });
  await description.fill('Chapter 4');
  await modal.getByRole('button', { name: '更多设置', exact: true }).click();
  await modal.getByRole('button', { name: '紧急', exact: true }).click();
  await modal.getByRole('button', { name: '存草稿', exact: true }).click();
  await expect(modal).toHaveCount(0);

  await page.reload();
  modal = await openCreateTask(page);
  const collection = modal.getByRole('button', { name: '草稿集', exact: true });
  await expect(collection).toBeVisible();
  await collection.click();
  await modal.getByRole('button', { name: /^Draft A/ }).click();

  await expect(modal.getByPlaceholder('任务标题')).toHaveValue('Draft A');
  await expect(modal.getByRole('textbox', { name: '简介', exact: true })).toHaveValue('Chapter 4');
  await expect(modal.getByRole('button', { name: '紧急', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await modal.getByPlaceholder('任务标题').fill('Draft A Modified');
  await modal.getByRole('button', { name: '创建任务', exact: true }).click();

  await expect(page.locator('.task-row').filter({ hasText: 'Draft A Modified' })).toHaveCount(1);
  expect(await readTable(page, 'taskDrafts')).toHaveLength(1);
  const tasks = await readTable(page, 'tasks');
  expect(tasks).toHaveLength(1);
  expect(tasks[0]).toMatchObject({ title: 'Draft A Modified', priority: 'high', status: 'active' });
});

test('closing an edited draft preserves the original and saves the new version', async ({
  page,
}) => {
  let modal = await openCreateTask(page);
  await modal.getByPlaceholder('任务标题').fill('Cancel Draft');
  await modal.getByRole('button', { name: '存草稿', exact: true }).click();
  await expect(modal).toHaveCount(0);

  modal = await openCreateTask(page);
  await modal.getByRole('button', { name: '草稿集', exact: true }).click();
  await modal.getByRole('button', { name: /^Cancel Draft/ }).click();
  await modal.getByPlaceholder('任务标题').fill('Changed then cancelled');
  await page.keyboard.press('Escape');
  await expect(modal).toHaveCount(0);

  expect(await readTable(page, 'tasks')).toHaveLength(0);
  const drafts = await readTable(page, 'taskDrafts');
  expect(drafts).toHaveLength(2);
  expect(drafts.map((draft) => draft.title).sort()).toEqual(['Cancel Draft', 'Changed then cancelled']);
});

test('rapid draft switching leaves the final selected snapshot in the create form', async ({
  page,
}) => {
  for (const title of ['Draft A', 'Draft B', 'Draft C']) {
    const modal = await openCreateTask(page);
    await modal.getByPlaceholder('任务标题').fill(title);
    await modal.getByRole('button', { name: '存草稿', exact: true }).click();
    await expect(modal).toHaveCount(0);
  }

  const modal = await openCreateTask(page);
  await modal.getByRole('button', { name: '草稿集', exact: true }).click();
  await expect(modal.getByRole('button', { name: /^Draft A/ })).toBeVisible();
  await modal.locator('.create-task-draft-row').evaluateAll((buttons) => {
    for (const title of ['Draft A', 'Draft B', 'Draft C']) {
      buttons.find((button) => button.textContent?.includes(title))?.click();
    }
  });

  await expect(modal.getByPlaceholder('任务标题')).toHaveValue('Draft C');
});

test('a draft can be deleted from the collection without creating or deleting tasks', async ({
  page,
}) => {
  let modal = await openCreateTask(page);
  await modal.getByPlaceholder('任务标题').fill('Disposable Draft');
  await modal.getByRole('button', { name: '存草稿', exact: true }).click();

  modal = await openCreateTask(page);
  await modal.getByRole('button', { name: '草稿集', exact: true }).click();
  await modal.getByRole('button', { name: '删除草稿：Disposable Draft' }).click();
  const confirmation = page.getByRole('dialog', { name: '删除草稿' });
  await confirmation.getByRole('button', { name: '删除', exact: true }).click();

  await expect(modal.getByText('Disposable Draft')).toHaveCount(0);
  expect(await readTable(page, 'taskDrafts')).toHaveLength(0);
  expect(await readTable(page, 'tasks')).toHaveLength(0);
});
