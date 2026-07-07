import { test, expect } from '@playwright/test';

test('reduced motion: stills render instead of the scrub', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error' && !/favicon/i.test(m.text())) errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/no-scrub/);
  await expect(page.locator('#loader')).toHaveCount(0);
  const stills = page.locator('.stills img');
  await expect(stills).toHaveCount(4);
  for (const img of await stills.all()) {
    await expect(img).toBeVisible();
    // stills are loading="lazy" — bring each into view like a reader would
    await img.scrollIntoViewIfNeeded();
    await expect
      .poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth), { timeout: 15_000 })
      .toBeGreaterThan(0);
  }
  await expect(page.locator('.journey')).toBeHidden();
  expect(errors).toEqual([]);
});
