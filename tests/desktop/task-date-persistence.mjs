import { _electron, expect } from 'playwright/test';
import { mkdtemp } from 'node:fs/promises';
const profile = await mkdtemp('/private/tmp/gtasker-task-dates-');
const app = await _electron.launch({ executablePath: 'release/G-tasker-darwin-arm64/G-tasker.app/Contents/MacOS/G-tasker', args: ['--user-data-dir=' + profile] });
try {
  const p = await app.firstWindow();
  await p.waitForLoadState('domcontentloaded');
  await p.evaluate(() => { localStorage.setItem('app-language', 'zh'); localStorage.setItem('gtasker-onboarding-done', 'true'); location.hash = '/app/today'; });
  await p.reload();
  for (const advanced of [false, true]) {
    const title = advanced ? 'Date persistence advanced toggle' : 'Date persistence simple';
    await p.getByRole('button', { name: '新建任务', exact: true }).click();
    const modal = p.locator('[data-ui="modal"]');
    await modal.locator('input').first().fill(title);
    await modal.locator('.gt-picker-trigger').first().click();
    await p.locator('.gt-picker-panel:popover-open').getByRole('button', { name: '今天', exact: true }).click();
    await modal.getByRole('button', { name: '设定时间', exact: true }).first().click();
    await modal.locator('.gt-picker-trigger').nth(1).click();
    const panel = p.locator('.gt-picker-panel:popover-open');
    await panel.getByRole('group', { name: '小时', exact: true }).getByRole('button', { name: '23', exact: true }).click();
    await panel.getByRole('group', { name: '分钟', exact: true }).getByRole('button', { name: '45', exact: true }).click();
    await panel.getByRole('button', { name: '完成', exact: true }).click();
    if (advanced) await modal.getByRole('button', { name: '高级', exact: true }).click();
    await modal.getByRole('button', { name: '创建任务', exact: true }).click();
    await expect(modal).toHaveCount(0);
    const tasks = await p.evaluate(() => new Promise((resolve, reject) => {
      const request = indexedDB.open('TaskManagerDB');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => { const db = request.result; const query = db.transaction('tasks').objectStore('tasks').getAll(); query.onsuccess = () => { resolve(query.result); db.close(); }; };
    }));
    console.log(JSON.stringify(tasks.map(t => ({ title: t.title, dueDate: t.dueDate, dueTime: t.dueTime }))));
    await expect(p.locator('.task-row').filter({ hasText: title })).toBeVisible();
    await expect(p.locator('.task-row').filter({ hasText: title })).toContainText('23:45');
    await p.reload();
    await expect(p.locator('.task-row').filter({ hasText: title })).toBeVisible();
  }
} finally { await app.close(); }
