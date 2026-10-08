import { expect, test, type Page } from 'playwright/test';

async function prepare(page: Page, storedAccent?: string) {
  await page.addInitScript((accent) => {
    localStorage.setItem('gtasker-onboarding-done', 'true');
    localStorage.setItem('app-language', 'en');
    localStorage.setItem('theme-mode', JSON.stringify('light'));
    if (accent === undefined) localStorage.removeItem('interaction-accent');
    else localStorage.setItem('interaction-accent', accent);
  }, storedAccent);
}

test('uses the fixed monochrome interaction accent', async ({ page }) => {
  await prepare(page);
  await page.goto('/app/settings');

  await expect(page.locator('html')).toHaveAttribute('data-accent', 'white');
  const tokens = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return {
      accent: style.getPropertyValue('--gt-accent').trim(),
      primary: style.getPropertyValue('--color-primary').trim(),
      focus: style.getPropertyValue('--gt-focus-ring-color').trim(),
    };
  });
  expect(tokens).toEqual({ accent: '#262626', primary: '#262626', focus: '#262626' });
});

test('ignores legacy stored accent preferences without rewriting user storage', async ({ page }) => {
  await prepare(page, 'red');
  await page.goto('/app/settings');

  await expect(page.locator('html')).toHaveAttribute('data-accent', 'white');
  expect(await page.evaluate(() => localStorage.getItem('interaction-accent'))).toBe('red');
  await expect(page.locator('[data-ui="accent-palette"]')).toHaveCount(0);
});

test('switches the shared monochrome token from black to white in dark mode', async ({ page }) => {
  await prepare(page);
  await page.goto('/app/settings');
  const readTokens = () =>
    page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      return {
        accent: style.getPropertyValue('--gt-accent').trim(),
        edge: style.getPropertyValue('--gt-accent-edge').trim(),
      };
    });

  expect(await readTokens()).toEqual({ accent: '#262626', edge: '#1f1f1f' });
  await page.getByRole('button', { name: 'Dark', exact: true }).click();
  const darkTokens = await readTokens();
  expect(darkTokens.accent).toBe('#fff');
  expect(['rgba(255, 255, 255, 0.72)', '#ffffffb8']).toContain(darkTokens.edge);
});

test('keeps primary controls readable and visibly interactive', async ({ page }) => {
  await prepare(page);
  await page.goto('/app/today');
  const createButton = page.locator('[data-ui="create-task-trigger"]');

  await expect(createButton).toHaveCSS('background-color', 'rgb(42, 42, 42)');
  await expect(createButton).toHaveCSS('color', 'rgb(255, 255, 255)');
  const restingShadow = await createButton.evaluate((element) => getComputedStyle(element).boxShadow);
  await createButton.hover();
  await expect(createButton).toHaveCSS('background-color', 'rgb(51, 51, 51)');
  await expect
    .poll(async () => createButton.evaluate((element) => getComputedStyle(element).boxShadow))
    .not.toBe(restingShadow);
});

test('keeps keyboard focus visible in light and dark modes', async ({ page }) => {
  await prepare(page);
  await page.goto('/app/settings');
  const holidaySelect = page.getByRole('combobox', { name: 'Calendar Holidays' });

  await holidaySelect.focus();
  await expect(holidaySelect).toBeFocused();
  await expect
    .poll(async () => holidaySelect.evaluate((element) => getComputedStyle(element).boxShadow))
    .not.toBe('none');

  await page.getByRole('button', { name: 'Dark', exact: true }).click();
  await holidaySelect.focus();
  await expect
    .poll(async () => holidaySelect.evaluate((element) => getComputedStyle(element).boxShadow))
    .not.toBe('none');
});
