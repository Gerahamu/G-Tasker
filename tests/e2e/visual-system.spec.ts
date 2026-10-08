import { expect, test } from 'playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('gtasker-onboarding-done', 'true');
    localStorage.setItem('app-language', 'zh');
    localStorage.setItem('theme-mode', JSON.stringify('light'));
  });
});

test('exposes the restrained spatial application frame', async ({ page }) => {
  await page.goto('/app/all');
  await expect(page.locator('[data-ui="app-shell"]')).toHaveCount(1);
  await expect(page.locator('[data-ui="sidebar"]')).toHaveCount(1);
  await expect(page.locator('[data-ui="toolbar"]')).toHaveCount(1);
  await expect(page.locator('[data-ui="workspace"]')).toHaveCount(1);
  const tokens = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return {
      fog: style.getPropertyValue('--gt-fog-silver').trim().toLowerCase(),
      solid: style.getPropertyValue('--gt-solid-white').trim().toLowerCase(),
      graphite: style.getPropertyValue('--gt-graphite').trim().toLowerCase(),
      indigo: style.getPropertyValue('--gt-indigo').trim().toLowerCase(),
    };
  });
  expect(tokens).toEqual({
    fog: '#f5f6f5',
    solid: '#fff',
    graphite: '#20222a',
    indigo: '#262626',
  });
});

test('completes the restrained title startup animation', async ({ page }) => {
  await page.goto('/app/all');
  const overlay = page.locator('[data-ui="startup-overlay"]');
  await expect(overlay).toHaveCount(1);
  await expect(page.locator('.startup-wordmark')).toHaveText('G-Tasker');

  const backgroundColors = await page.evaluate(() => {
    const overlayStyle = getComputedStyle(document.querySelector('[data-ui="startup-overlay"]')!);
    const appShellStyle = getComputedStyle(document.querySelector('[data-ui="app-shell"]')!);
    return [overlayStyle.backgroundColor, appShellStyle.backgroundColor];
  });
  expect(backgroundColors[0]).not.toBe('rgba(0, 0, 0, 0)');
  expect(backgroundColors[1]).not.toBe('rgba(0, 0, 0, 0)');

  await expect(overlay).toHaveCount(0, { timeout: 3000 });
  await expect(page.locator('[data-ui="app-shell"]')).toBeVisible();
});

test('finishes startup animation with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/app/all');
  await expect(page.locator('[data-ui="startup-overlay"]')).toHaveCount(0, { timeout: 3000 });
  await expect(page.locator('[data-ui="app-shell"]')).toBeVisible();
});

test('uses floating material for dialogs and grouped surfaces for settings', async ({ page }, testInfo) => {
  await page.goto('/app/settings');
  await expect(page.locator('[data-ui="settings-group"]')).not.toHaveCount(0);
  await page.goto('/app/all');
  await page.getByRole('button', { name: '新建任务' }).click();
  const modal = page.locator('[data-ui="modal"]');
  await expect(modal).toBeVisible();
  await expect(modal).toHaveCSS(
    'border-radius',
    testInfo.project.name === 'mobile-chrome' ? '20px' : '24px',
  );
  await expect(page.getByPlaceholder('任务标题')).toHaveCSS('outline-style', 'none');
});

test('exposes medium glass and edge refraction tokens', async ({ page }) => {
  await page.goto('/app/settings');
  const tokens = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return {
      highlight: style.getPropertyValue('--gt-refraction-highlight').trim(),
      shadow: style.getPropertyValue('--gt-refraction-shadow').trim(),
      dispersion: style.getPropertyValue('--gt-refraction-dispersion').trim(),
    };
  });
  expect(tokens.highlight).not.toBe('');
  expect(tokens.shadow).not.toBe('');
  expect(tokens.dispersion).not.toBe('');
  const glass = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    return {
      blur: root.getPropertyValue('--gt-blur-nav').trim(),
      material: root.getPropertyValue('--gt-material-nav').trim(),
    };
  });
  expect(glass.blur).toMatch(/^(?:2[4-9]|3[0-2])px$/);
  expect(glass.material.toLowerCase()).toBe('#f5f6f5');
});

test('keeps shared controls readable on smoked glass in dark mode', async ({ page }) => {
  await page.goto('/app/settings');
  await page.evaluate(() => document.documentElement.classList.add('dark'));

  const mutedBadge = page.locator('[data-testid="muted-badge-probe"]');
  await page.evaluate(() => {
    const badge = document.createElement('span');
    badge.className = 'gt-badge gt-badge-muted';
    badge.dataset.testid = 'muted-badge-probe';
    badge.textContent = 'Low';
    document.body.appendChild(badge);
  });

  await expect(page.locator('.gt-field').first()).toHaveCSS('background-color', 'rgb(32, 35, 43)');
  await expect(page.locator('.gt-segmented').first()).toHaveCSS(
    'background-color',
    'rgb(32, 36, 34)',
  );
  await expect(mutedBadge).toHaveCSS('color', 'rgb(199, 204, 214)');
  await expect(mutedBadge).toHaveCSS('background-color', 'rgba(255, 255, 255, 0.08)');
});

test('keeps desktop sidebar hit targets stable during hover', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Desktop hover is covered by the desktop project.');

  await page.goto('/app/all');
  const link = page.locator('[data-ui="sidebar"] .sidebar-link:not(.active)').first();
  const content = link.locator('[data-ui="sidebar-content"]');
  await expect(content).toHaveCount(1);

  const before = await link.boundingBox();
  expect(before).not.toBeNull();
  await link.hover();

  await expect(content).toHaveCSS('transform', 'none');
  const after = await link.boundingBox();
  expect(after).not.toBeNull();
  expect(after?.y).toBe(before?.y);
});

test('does not lift sidebar content when reduced motion is preferred', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'The lift is intentionally desktop-only.');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/app/all');
  const link = page.locator('[data-ui="sidebar"] .sidebar-link:not(.active)').first();
  const content = link.locator('[data-ui="sidebar-content"]');
  await expect(content).toHaveCount(1);

  await link.hover();
  await expect
    .poll(() => content.evaluate((element) => getComputedStyle(element).transform))
    .toBe('none');
});
