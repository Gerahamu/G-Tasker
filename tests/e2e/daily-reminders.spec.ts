import { expect, test, type Page } from 'playwright/test';

const settingsKey = 'daily-reminder-settings';
const stateKey = 'daily-reminder-state';

async function prepare(page: Page, settings: Record<string, unknown>) {
  await page.addInitScript(
    ({ settingsKey, stateKey, settings }) => {
      localStorage.setItem('gtasker-onboarding-done', 'true');
      localStorage.setItem('app-language', 'zh');
      if (!localStorage.getItem(settingsKey)) {
        localStorage.setItem(settingsKey, JSON.stringify(settings));
        localStorage.removeItem(stateKey);
      }
    },
    { settingsKey, stateKey, settings },
  );
  await page.goto('/app/all');
}

async function readTasks(page: Page): Promise<Record<string, unknown>[]> {
  return page.evaluate(
    () =>
      new Promise<Record<string, unknown>[]>((resolve, reject) => {
        const request = indexedDB.open('TaskManagerDB');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const database = request.result;
          const query = database.transaction('tasks').objectStore('tasks').getAll();
          query.onerror = () => reject(query.error);
          query.onsuccess = () => {
            resolve(query.result);
            database.close();
          };
        };
      }),
  );
}

test('morning reminder is persisted before display and does not repeat after reload', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date('2026-10-03T08:30:00'));
  await prepare(page, {
    morningEnabled: true,
    morningTime: '00:00',
    eveningEnabled: false,
    eveningTime: '21:00',
    weekendEnabled: true,
    showWhenNoTasks: true,
  });

  const modal = page.locator('[data-ui="daily-morning-reminder"]');
  await expect(modal).toBeVisible();
  const state = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? '{}'),
    stateKey,
  );
  const localDate = await page.evaluate(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  expect(state.morningLastShownDate).toBe(localDate);
  await modal
    .locator('.daily-reminder-actions')
    .getByRole('button', { name: '关闭', exact: true })
    .click();
  await page.reload();
  await expect(modal).toHaveCount(0);
});

test('settings persist both daily reminder times and switches', async ({ page }) => {
  await prepare(page, {
    morningEnabled: false,
    morningTime: '08:00',
    eveningEnabled: false,
    eveningTime: '21:00',
    weekendEnabled: true,
    showWhenNoTasks: false,
  });
  await page.goto('/app/settings');
  await page.getByRole('switch', { name: '早间提醒' }).click();
  await page.getByLabel('早间提醒时间').fill('07:15');
  await page.getByRole('switch', { name: '晚间提醒' }).click();
  await page.getByLabel('晚间提醒时间').fill('22:20');
  await page.getByRole('switch', { name: '周末提醒' }).click();
  await page.getByRole('switch', { name: '没有任务时仍显示提醒' }).click();

  const stored = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? '{}'),
    settingsKey,
  );
  expect(stored).toEqual({
    morningEnabled: true,
    morningTime: '07:15',
    eveningEnabled: true,
    eveningTime: '22:20',
    weekendEnabled: false,
    showWhenNoTasks: true,
  });
});

test('evening quick action moves an unfinished task to tomorrow in IndexedDB', async ({ page }) => {
  await prepare(page, {
    morningEnabled: false,
    morningTime: '08:00',
    eveningEnabled: false,
    eveningTime: '21:00',
    weekendEnabled: true,
    showWhenNoTasks: false,
  });
  const dates = await page.evaluate(() => {
    const format = (date: Date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const now = new Date();
    return {
      today: format(now),
      tomorrow: format(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)),
    };
  });
  await page.getByRole('button', { name: '新建任务', exact: true }).click();
  const createDialog = page.getByRole('dialog', { name: '新建任务' });
  await createDialog.getByPlaceholder('任务标题').fill('晚间待处理任务');
  await createDialog.getByRole('button', { name: '今天', exact: true }).click();
  await createDialog.getByRole('button', { name: '创建任务', exact: true }).click();
  await expect(page.locator('.task-row').filter({ hasText: '晚间待处理任务' })).toBeVisible();
  await page.evaluate(
    ({ settingsKey, stateKey }) => {
      localStorage.setItem(
        settingsKey,
        JSON.stringify({
          morningEnabled: false,
          morningTime: '08:00',
          eveningEnabled: true,
          eveningTime: '00:00',
          weekendEnabled: true,
          showWhenNoTasks: false,
        }),
      );
      localStorage.removeItem(stateKey);
    },
    { settingsKey, stateKey },
  );
  await page.reload();

  const modal = page.locator('[data-ui="daily-evening-reminder"]');
  await expect(modal).toContainText('晚间待处理任务');
  await modal.getByRole('button', { name: '移到明天', exact: true }).click();
  await expect.poll(async () => (await readTasks(page))[0]?.dueDate).toBe(dates.tomorrow);
});
