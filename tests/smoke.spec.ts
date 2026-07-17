import { test, expect, type Page } from '@playwright/test';

const PAGES = [
  { path: '/', title: /Bravura Builders/, h1: /Flawless Results/ },
  { path: '/construction', title: /Construction/, h1: /the number we build/i },
  { path: '/design', title: /Design/, h1: /yours to keep/i },
  { path: '/projects', title: /Projects/, h1: /photos and renderings/i },
  { path: '/about', title: /About/, h1: /Atlanta/ },
  { path: '/contact', title: /Contact/, h1: /free estimate/i },
];

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

for (const p of PAGES) {
  test(`${p.path} boots clean with correct heading + landmarks`, async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto(p.path);
    await expect(page).toHaveTitle(p.title);
    const h1 = page.locator('main h1').first();
    await expect(h1).toBeVisible();
    await expect(h1).toContainText(p.h1);
    await expect(page.locator('header.site-head')).toBeVisible();
    await expect(page.locator('main#main-content')).toHaveCount(1);
    await expect(page.locator('footer')).toBeVisible();
    await expect(page.locator('a.skip-link')).toHaveAttribute('href', '#main-content');
    expect(errors, errors.join('\n')).toEqual([]);
  });
}

test('primary nav links reach every page', async ({ page }) => {
  await page.goto('/');
  for (const label of ['Construction', 'Design', 'Projects', 'About', 'Contact']) {
    await page.locator('nav.main-nav').getByRole('link', { name: label, exact: true }).click();
    await expect(page.locator('nav.main-nav a[aria-current="page"]')).toHaveText(label);
  }
});

test('home hero stats count up to real values on scroll', async ({ page }) => {
  await page.goto('/');
  const sqft = page.locator('.stat', { hasText: 'FT' }).locator('[data-count]');
  await expect(sqft).toHaveText('0');
  await page.mouse.wheel(0, 2200);
  await expect(sqft).toHaveText('150,000', { timeout: 4000 });
});

test('projects: filter narrows the grid and lightbox opens + closes', async ({ page }) => {
  await page.goto('/projects');
  await expect(page.locator('.proj-grid .card')).toHaveCount(17);
  await page.getByRole('button', { name: 'Baths' }).click();
  await expect(page.locator('.proj-grid .card:visible')).toHaveCount(5);
  await page.getByRole('button', { name: 'All' }).click();
  await page.locator('.proj-grid .card img').first().click();
  const lb = page.locator('#lightbox');
  await expect(lb).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(lb).toBeHidden();
});

test('contact form: labelled required fields + honeypot present', async ({ page }) => {
  await page.goto('/contact');
  for (const id of ['f-name', 'f-phone', 'f-email']) {
    await expect(page.locator(`#${id}`)).toHaveAttribute('required', '');
    await expect(page.locator(`label[for="${id}"]`)).toBeVisible();
  }
  await expect(page.locator('input[name="access_key"]')).toHaveCount(1);
  const honeypot = page.locator('input[name="botcheck"]');
  await expect(honeypot).toHaveCount(1);
  await expect(honeypot).toHaveAttribute('aria-hidden', 'true');
  await expect(honeypot).toHaveClass(/hp/);
});
