import { _electron, expect } from 'playwright/test';
import { mkdtemp } from 'node:fs/promises';
const profile = await mkdtemp('/private/tmp/gtasker-picker-');
const app = await _electron.launch({ executablePath: 'release/G-tasker-darwin-arm64/G-tasker.app/Contents/MacOS/G-tasker', args: ['--user-data-dir=' + profile] });
try {
  const p = await app.firstWindow();
  p.setDefaultTimeout(10000);
  await p.waitForLoadState('domcontentloaded');
  await p.evaluate(() => {
    localStorage.setItem('app-language', 'zh');
    localStorage.setItem('gtasker-onboarding-done', 'true');
    location.hash = '/app/today';
  });
  await p.reload();
  await p.getByRole('button', { name: '新建任务', exact: true }).click();
  const date = p.locator('.gt-picker-trigger').first();
  await date.click();
  const panel = p.locator('.gt-picker-panel:popover-open');
  await expect(panel).toBeVisible();
  await expect(panel.locator('.gt-picker-grid button')).toHaveCount(42);
  await p.screenshot({ path: '../work/date-picker.png' });
  await panel.getByRole('button', { name: '今天', exact: true }).click();
  await expect(panel).toHaveCount(0);
  await date.click();
  await panel.getByRole('button', { name: '清空', exact: true }).click();
  await expect(date).toContainText('选择日期');
  await date.click();
  await p.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);
  await p.getByRole('button', { name: '设定时间', exact: true }).first().click();
  await p.locator('.gt-picker-trigger').nth(1).click();
  await expect(panel.locator('.gt-picker-scroll').first().locator('button')).toHaveCount(24);
  await panel.getByRole('group', { name: '小时', exact: true }).getByRole('button', { name: '09', exact: true }).click();
  await panel.getByRole('group', { name: '分钟', exact: true }).getByRole('button', { name: '35', exact: true }).click();
  await expect(p.locator('.gt-picker-trigger').nth(1)).toContainText('09:35');
  await p.screenshot({ path: '../work/time-picker.png' });
  await panel.getByRole('button', { name: '完成', exact: true }).click();
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(980, 720));
  await date.click();
  await panel.getByRole('spinbutton', { name: '年份' }).fill('2028');
  await panel.getByRole('combobox', { name: '月份' }).selectOption('1');
  await panel.getByRole('button', { name: '2028-02-29', exact: true }).click();
  await expect(date).toContainText('2028/02/29');
  await date.click();
  const inViewport = await panel.evaluate(el => {
    const r = el.getBoundingClientRect();
    return r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight;
  });
  expect(inViewport).toBe(true);
  await p.evaluate(() => document.documentElement.classList.add('dark'));
  await p.screenshot({ path: '../work/date-picker-dark.png' });
  await p.keyboard.press('Escape');
  console.log('PASS: date selection, clear, Escape, time selection and screenshots');
} finally {
  await app.close();
}
