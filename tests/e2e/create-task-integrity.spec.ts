import { expect, test, type Locator, type Page } from 'playwright/test';

async function prepareApp(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('gtasker-onboarding-done', 'true');
    localStorage.setItem('app-language', 'zh');
    localStorage.setItem('theme-mode', JSON.stringify('light'));
  });
  await page.goto('/app/all');
}

async function openCreateTask(page: Page) {
  await page.getByRole('button', { name: '新建任务', exact: true }).click();
  return page.getByRole('dialog', { name: '新建任务', exact: true });
}

async function setDate(page: Page, scope: Locator, label: string, date: string) {
  await scope.getByRole('button', { name: label, exact: true }).click();
  const picker = page.getByRole('dialog', { name: label, exact: true });
  const [year, month] = date.split('-');
  await picker.getByRole('spinbutton', { name: '年份' }).fill(year);
  await picker.getByRole('combobox', { name: '月份' }).selectOption(String(Number(month) - 1));
  await picker.getByRole('button', { name: date, exact: true }).click();
}

async function setTime(page: Page, scope: Locator, label: string, hour: string, minute: string) {
  await scope.getByRole('button', { name: label, exact: true }).click();
  const picker = page.getByRole('dialog', { name: label, exact: true });
  await picker.getByRole('group', { name: '小时' }).getByRole('button', { name: hour }).click();
  await picker.getByRole('group', { name: '分钟' }).getByRole('button', { name: minute }).click();
  await picker.getByRole('button', { name: '完成', exact: true }).click();
}

async function readTable(page: Page, tableName: string): Promise<Record<string, unknown>[]> {
  return page.evaluate(
    (tableName) =>
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
    tableName,
  );
}

const readTasks = (page: Page) => readTable(page, 'tasks');

test.beforeEach(async ({ page }) => {
  await prepareApp(page);
});

test('Enter creates from the task title only', async ({ page }) => {
  const firstModal = await openCreateTask(page);
  await firstModal.getByPlaceholder('任务标题').fill('标题回车创建');
  await firstModal.getByPlaceholder('任务标题').press('Enter');
  await expect(firstModal).toHaveCount(0);
  await expect
    .poll(async () => (await readTasks(page)).map((task) => task.title))
    .toEqual(['标题回车创建']);

  const secondModal = await openCreateTask(page);
  await secondModal.getByPlaceholder('任务标题').fill('描述框不能回车创建');
  await secondModal.getByRole('textbox', { name: '简介', exact: true }).fill('附加说明');
  await secondModal.getByRole('textbox', { name: '简介', exact: true }).press('Enter');
  await expect(secondModal).toBeVisible();
  await expect
    .poll(async () => (await readTasks(page)).map((task) => task.title))
    .toEqual(['标题回车创建']);

  await secondModal.getByRole('button', { name: '创建任务', exact: true }).click();
  await expect(secondModal).toHaveCount(0);
  await expect
    .poll(async () => (await readTasks(page)).map((task) => task.title))
    .toEqual(['标题回车创建', '描述框不能回车创建']);
});

test('hiding a previously entered due time removes it from the stored task after reload', async ({
  page,
}) => {
  const modal = await openCreateTask(page);
  await modal.getByPlaceholder('任务标题').fill('隐藏时间清理');
  await setDate(page, modal, '截止日期', '2026-09-20');
  await modal.getByRole('button', { name: '设定时间', exact: true }).click();
  await setTime(page, modal, '截止时间', '09', '45');
  await modal.getByRole('button', { name: '收起时间', exact: true }).click();
  await modal.getByRole('button', { name: '创建任务', exact: true }).click();
  await expect(modal).toHaveCount(0);

  let tasks = await readTasks(page);
  expect(tasks).toHaveLength(1);
  expect(tasks[0]).toMatchObject({
    title: '隐藏时间清理',
    dueDate: '2026-09-20',
    dueTime: null,
    dateMode: 'simple',
    reminder: { anchor: 'due', minutesBefore: 15 },
  });

  await page.reload();
  await expect(page.locator('.task-row').filter({ hasText: '隐藏时间清理' })).toHaveCount(1);
  tasks = await readTasks(page);
  const [stored] = tasks;
  expect(stored).toMatchObject({
    title: '隐藏时间清理',
    dueDate: '2026-09-20',
    dueTime: null,
    dateMode: 'simple',
    reminder: { anchor: 'due', minutesBefore: 15 },
  });
});

test('advanced selections reach IndexedDB and are read back on the task detail page', async ({
  page,
}) => {
  test.setTimeout(60_000);
  const modal = await openCreateTask(page);
  await modal.getByPlaceholder('任务标题').fill('完整高级设置');
  await modal.getByRole('textbox', { name: '简介', exact: true }).fill('数据链路');
  await modal.locator('.create-task-list-field select').selectOption('-1');
  await modal.getByPlaceholder('列表名称...').fill('审计列表');
  await modal.getByRole('button', { name: '创建', exact: true }).click();
  await expect(modal.locator('.create-task-list-field select')).toHaveValue(/\d+/);
  const subtaskComposer = modal.locator('.create-task-subtask-composer');
  await subtaskComposer.getByRole('textbox').fill('子任务 A');
  await subtaskComposer.getByRole('button').click();
  await subtaskComposer.getByRole('textbox').fill('子任务 B');
  await subtaskComposer.getByRole('button').click();
  await setDate(page, modal, '截止日期', '2026-09-20');
  await modal.getByRole('button', { name: '更多设置', exact: true }).click();
  await modal.getByRole('button', { name: '精确时间', exact: true }).click();
  await setDate(page, modal, '开始日期', '2026-09-20');
  await setTime(page, modal, '开始时间', '09', '00');
  await setDate(page, modal, '结束日期', '2026-09-20');
  await setTime(page, modal, '结束时间', '10', '00');

  await modal.getByRole('button', { name: '重复', exact: true }).click();
  await page.getByRole('option', { name: '每天', exact: true }).click();
  await setDate(page, modal, '重复结束日期', '2026-10-20');

  await modal.getByRole('button', { name: '提醒', exact: true }).click();
  await page.getByRole('option', { name: '开始前 10 分钟', exact: true }).click();
  await modal.getByRole('button', { name: '紧急', exact: true }).click();

  await modal.getByRole('button', { name: '时间安排', exact: true }).click();
  await page.getByRole('option', { name: '指定时间段内完成', exact: true }).click();
  await setTime(page, modal, '窗口开始', '08', '00');
  await setTime(page, modal, '窗口结束', '12', '00');
  await modal.locator('.create-task-window-fields input[type="number"]').fill('45');

  await modal.getByRole('button', { name: '任务未完成时', exact: true }).click();
  await page.getByRole('option', { name: '顺延到明天', exact: true }).click();
  await modal.getByRole('checkbox', { name: /锁定此时间段/ }).check();
  await modal.getByRole('button', { name: '创建任务', exact: true }).click();

  const [stored] = await readTasks(page);
  expect(stored).toMatchObject({
    title: '完整高级设置',
    notes: '数据链路',
    priority: 'high',
    isFlagged: false,
    dateMode: 'advanced',
    dateStart: '2026-09-20T09:00',
    dateEnd: '2026-09-20T09:45',
    dueDate: '2026-09-20',
    dueTime: '09:45',
    durationMinutes: 45,
    repeatRule: { frequency: 'daily', interval: 1, endDate: '2026-10-20' },
    reminder: { anchor: 'start', minutesBefore: 10 },
    timeFlexibility: 'window',
    timeWindowStart: '08:00',
    timeWindowEnd: '12:00',
    reschedulePolicy: 'tomorrow',
    timeBlockLocked: true,
  });
  const lists = await readTable(page, 'taskLists');
  expect(lists.find((list) => list.name === '审计列表')?.id).toBe(stored.listId);
  const subtasks = await readTable(page, 'subtasks');
  expect(subtasks.map((subtask) => subtask.title)).toEqual(['子任务 A', '子任务 B']);

  await page.reload();
  await page.getByText('完整高级设置', { exact: true }).click();
  const planning = page.locator('[data-ui="task-planning-details"]');
  await expect(planning).toContainText('预计时长');
  await expect(planning).toContainText('45 分钟');
  await expect(planning).toContainText('每天');
  await expect(planning).toContainText('开始前 10 分钟');
  await expect(planning).toContainText('时间段 08:00–12:00');
  await expect(planning).toContainText('顺延到明天');
  await expect(planning).toContainText('已锁定时间块');
});
