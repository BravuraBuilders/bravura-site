import { test, expect } from '@playwright/test';

test('reduced motion: content is shown without animation and stats read final values', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/');

  // reveal elements must be fully visible (no lingering opacity:0 from the reveal animation)
  const firstReveal = page.locator('.rv').first();
  await expect(firstReveal).toBeVisible();
  await expect(firstReveal).toHaveCSS('opacity', '1');

  // counters must show their final formatted values immediately, without scrolling
  const sqft = page.locator('.stat', { hasText: 'FT' }).locator('[data-count]');
  await expect(sqft).toHaveText('150,000');

  expect(errors, errors.join('\n')).toEqual([]);
});
