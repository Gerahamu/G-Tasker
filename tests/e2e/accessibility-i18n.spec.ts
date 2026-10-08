import { expect, test, type Page } from 'playwright/test';

type Language = 'zh' | 'en' | 'ja';

async function prepare(page: Page, language: Language = 'en') {
  await page.addInitScript((lang) => {
    localStorage.setItem('gtasker-onboarding-done', 'true');
    localStorage.setItem('app-language', lang);
    localStorage.setItem('theme-mode', JSON.stringify('light'));
    localStorage.setItem('task-default-priority', JSON.stringify('high'));
  }, language);
}

test('planning view buttons expose the selected view', async ({ page }) => {
  await prepare(page);
  await page.goto('/app/planning');
  await page.getByRole('button', { name: 'New Plan', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'New Plan' });
  await expect(dialog.getByRole('button', { name: 'Day', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(dialog.getByRole('button', { name: 'Month', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await expect(dialog.getByRole('button', { name: 'More Settings', exact: true })).toBeVisible();
  await expect(dialog.locator('textarea.plan-note')).toBeVisible();
});

test('calendar navigation, mode, and dates have complete names and state', async ({ page }) => {
  await prepare(page);
  await page.goto('/app/calendar');
  await expect(page.getByRole('button', { name: 'Previous month' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next month' })).toBeVisible();
  const dateButtons = page.locator('[data-ui="calendar-date"]');
  await expect(dateButtons.first()).toHaveAttribute('aria-label', /2026|2027|2025/);
  const names = await dateButtons.evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('aria-label')),
  );
  expect(names.every(Boolean)).toBe(true);
  expect(new Set(names).size).toBe(names.length);
  await page.getByRole('button', { name: /countries selected/ }).click();
  await page.getByRole('checkbox', { name: /China/ }).check();
  await expect(page.getByRole('button', { name: 'Solar', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('settings exposes pressed, switch, and labeled combobox semantics', async ({ page }) => {
  await prepare(page);
  await page.goto('/app/settings');
  await expect(page.getByRole('button', { name: 'Light', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('switch', { name: 'Notifications', exact: true })).toHaveAttribute(
    'aria-checked',
    /true|false/,
  );
  await expect(page.getByRole('combobox', { name: 'Calendar Holidays' })).toBeVisible();
  await expect(page.getByText('Default Priority', { exact: true })).toHaveCount(0);
});

test('new task is a keyboard-closeable named dialog with labeled controls', async ({ page }) => {
  await prepare(page);
  await page.goto('/app/all');
  const trigger = page.getByRole('button', { name: 'New Task', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'New Task' });
  await expect(dialog).toHaveAttribute('aria-modal', 'true');
  await expect(dialog.getByRole('button', { name: 'Due Date', exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'More settings', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Urgent', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await expect(dialog.getByRole('button', { name: 'Normal', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('sidebar list controls are named and custom route uses its list name', async ({
  page,
}, testInfo) => {
  await prepare(page);
  await page.goto('/app/all');
  if (testInfo.project.name === 'mobile-chrome') {
    await page.goto('/app/lists');
  } else {
    await page.getByRole('button', { name: 'Lists', exact: true }).click();
  }
  await page.getByRole('banner').getByRole('button', { name: 'New List', exact: true }).click();
  const input = page.getByPlaceholder('List name...');
  await input.fill('Audit List');
  await input.press('Enter');
  await expect(page.locator('.navbar-title-editable')).toHaveText('Audit List');
  await expect(page.getByRole('button', { name: 'Delete list Audit List' })).toBeVisible();
});

const routeTitles: Record<Language, Array<[string, string]>> = {
  zh: [
    ['/app/today', '今天'],
    ['/app/scheduled', '已计划'],
    ['/app/all', '全部任务'],
    ['/app/flagged', '已标记'],
    ['/app/overdue', '逾期'],
    ['/app/memo', '备忘录'],
    ['/app/planning', '规划'],
    ['/app/calendar', '日历'],
    ['/app/search', '搜索'],
    ['/app/clock', '时钟'],
    ['/app/settings', '设置'],
  ],
  en: [
    ['/app/today', 'Today'],
    ['/app/scheduled', 'Scheduled'],
    ['/app/all', 'All Tasks'],
    ['/app/flagged', 'Flagged'],
    ['/app/overdue', 'Overdue'],
    ['/app/memo', 'Memos'],
    ['/app/planning', 'Planning'],
    ['/app/calendar', 'Calendar'],
    ['/app/search', 'Search'],
    ['/app/clock', 'Clock'],
    ['/app/settings', 'Settings'],
  ],
  ja: [
    ['/app/today', '今日'],
    ['/app/scheduled', '予定済み'],
    ['/app/all', 'すべて'],
    ['/app/flagged', 'フラグ付き'],
    ['/app/overdue', '期限切れ'],
    ['/app/memo', 'メモ'],
    ['/app/planning', '計画'],
    ['/app/calendar', 'カレンダー'],
    ['/app/search', '検索'],
    ['/app/clock', '時計'],
    ['/app/settings', '設定'],
  ],
};

for (const language of ['zh', 'en', 'ja'] as const) {
  test(`${language} localizes every primary route title`, async ({ page }) => {
    await prepare(page, language);
    for (const [route, title] of routeTitles[language]) {
      await page.goto(route);
      await expect(page.locator('header h2')).toHaveText(title);
    }
  });
}

test('saving a language change updates the app without reloading the page', async ({ page }) => {
  await prepare(page, 'zh');
  await page.goto('/app/settings');
  await page.evaluate(() => Object.assign(window, { __languageChangeMarker: true }));
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.locator('header h2')).toHaveText('Settings');
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('app-language'))).toBe('en');
  await expect.poll(() => page.evaluate(() => '__languageChangeMarker' in window)).toBe(true);
});

for (const [language, welcome] of [
  ['zh', '欢迎来到 G-Tasker'],
  ['en', 'Welcome to G-Tasker'],
  ['ja', 'G-Taskerへようこそ'],
] as const) {
  test(`${language} localizes the first-run guide`, async ({ page }) => {
    await page.addInitScript((lang) => {
      localStorage.removeItem('gtasker-onboarding-done');
      localStorage.setItem('app-language', lang);
    }, language);
    await page.goto('/app/today');
    await expect(page.getByRole('dialog', { name: welcome })).toBeVisible();
  });
}
