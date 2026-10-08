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

async function readTable(page: Page, storeName: string): Promise<Record<string, unknown>[]> {
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

test('plan modal stays compact and saves its existing period, task, and advanced settings', async ({
  page,
}) => {
  const taskTitle = '规划关联任务';
  await page.getByRole('button', { name: '新建任务', exact: true }).click();
  await page.getByPlaceholder('任务标题').fill(taskTitle);
  await page.getByRole('button', { name: '创建任务', exact: true }).click();
  await expect(page.locator('.task-row').filter({ hasText: taskTitle })).toHaveCount(1);

  await page.goto('/app/planning');
  await page.locator('[data-ui="create-plan-trigger"]').click();

  const modal = page.getByRole('dialog', { name: '新建规划' });
  const footer = modal.locator('.plan-modal-footer');
  await expect(modal).toBeVisible();
  await expect(modal.getByPlaceholder('规划名称')).toBeVisible();
  await expect(footer).toHaveCSS('justify-content', 'flex-end');

  const moreSettings = modal.getByRole('button', { name: '更多设置' });
  await expect(moreSettings).toHaveAttribute('aria-expanded', 'false');
  await expect(modal.locator('#plan-advanced-settings-content')).toBeHidden();

  const period = modal.getByRole('group', { name: '规划周期' });
  await period.getByRole('button', { name: '自定义', exact: true }).click();
  const startDate = modal.getByRole('button', { name: '开始日期' });
  const endDate = modal.getByRole('button', { name: '结束日期' });
  const modalBox = await modal.boundingBox();
  const startBox = await startDate.boundingBox();
  const endBox = await endDate.boundingBox();
  expect(modalBox).not.toBeNull();
  expect(startBox).not.toBeNull();
  expect(endBox).not.toBeNull();
  expect(startBox!.x).toBeGreaterThanOrEqual(modalBox!.x);
  expect(endBox!.x + endBox!.width).toBeLessThanOrEqual(modalBox!.x + modalBox!.width);

  await period.getByRole('button', { name: '周', exact: true }).click();
  const weekDate = modal.getByRole('button', { name: '选择一周' });
  await weekDate.click();
  await page
    .getByRole('dialog', { name: '选择一周' })
    .getByRole('button', { name: '2026-10-07' })
    .click();
  await expect(weekDate).toContainText('2026/10/07');

  const linkedTasks = modal.getByRole('button', { name: /关联任务/ });
  await expect(linkedTasks).toHaveAttribute('aria-expanded', 'false');
  await linkedTasks.click();
  const linkedTask = modal.getByRole('checkbox', { name: taskTitle });
  await expect(linkedTask).toBeVisible();
  await linkedTask.check();
  await expect(modal.locator('.plan-count')).toHaveText('1');

  await moreSettings.click();
  await expect(moreSettings).toHaveAttribute('aria-expanded', 'true');
  const advancedSettings = modal.locator('#plan-advanced-settings-content');
  await expect(advancedSettings).toBeVisible();
  await advancedSettings.getByRole('button', { name: '启用里程碑' }).click();
  const milestoneSection = advancedSettings.locator('.plan-advanced-setting').nth(0);
  await milestoneSection.getByRole('button', { name: /添加里程碑/ }).click();
  await milestoneSection.locator('.plan-item-input').fill('完成原型');

  await advancedSettings.getByRole('button', { name: '启用多线并行' }).click();
  const laneSection = advancedSettings.locator('.plan-advanced-setting').nth(1);
  await laneSection.locator('.plan-item-input').first().fill('设计执行线');

  await modal.getByPlaceholder('规划名称').fill('弹窗布局回归规划');
  await modal.getByPlaceholder('规划目标').fill('验证规划信息完整保存');
  await modal.getByPlaceholder('规划备注').fill('备注保留原有内容');
  await expect(footer).toBeInViewport();
  await footer.getByRole('button', { name: '创建规划' }).click();

  const planRows = await readTable(page, 'plannings');
  const savedPlan = planRows.find((row) => row.title === '弹窗布局回归规划');
  const tasks = await readTable(page, 'tasks');
  const savedTask = tasks.find((row) => row.title === taskTitle);
  if (!savedPlan) throw new Error('Created plan was not persisted');
  if (!savedTask) throw new Error('Linked task was not persisted');
  expect(savedPlan).toMatchObject({
    periodType: 'week',
    startDate: '2026-10-05',
    endDate: '2026-10-11',
    goal: '验证规划信息完整保存',
    note: '备注保留原有内容',
  });
  expect(savedPlan.taskIds).toEqual([savedTask.id]);
  expect((savedPlan.milestones as Array<{ title: string }>).map((item) => item.title)).toEqual([
    '完成原型',
  ]);
  expect((savedPlan.lanes as Array<{ name: string }>).map((item) => item.name)).toContain(
    '设计执行线',
  );
});
