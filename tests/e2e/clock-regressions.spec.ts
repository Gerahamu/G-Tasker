import { expect, test, type Page } from 'playwright/test';
import { todayISO } from '../../src/lib/format-date';

async function prepareApp(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('gtasker-onboarding-done', 'true');
    localStorage.setItem('app-language', 'zh');
    localStorage.setItem('theme-mode', JSON.stringify('light'));
  });
}

test('uses the local calendar date for task dates', () => {
  const originalDate = globalThis.Date;

  class FixedDate extends originalDate {
    constructor(...args: ConstructorParameters<DateConstructor>) {
      super(
        ...(args.length
          ? args
          : (['2026-08-13T16:30:00.000Z'] as ConstructorParameters<DateConstructor>)),
      );
    }
  }

  globalThis.Date = FixedDate as DateConstructor;
  try {
    expect(todayISO()).toBe('2026-08-14');
  } finally {
    globalThis.Date = originalDate;
  }
});

test('shows only one reminder when a countdown expires', async ({ page }) => {
  await prepareApp(page);
  await page.goto('/app/clock');
  await page.getByRole('tab', { name: '倒计时' }).click();
  await page.getByRole('button', { name: '新建倒计时' }).click();
  await page.getByLabel('名称').fill('单次到期提醒');
  await page.getByRole('spinbutton', { name: '分', exact: true }).fill('0');
  await page.getByRole('spinbutton', { name: '秒', exact: true }).fill('1');
  await page.getByRole('button', { name: '创建' }).click();
  await page.getByRole('button', { name: '开始' }).click();

  const reminders = page.getByRole('alertdialog', { name: '单次到期提醒' });
  await expect(reminders).toHaveCount(1, { timeout: 10_000 });
  await page.waitForTimeout(800);
  await expect(reminders).toHaveCount(1);
});
