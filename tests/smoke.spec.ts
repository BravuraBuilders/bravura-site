import { test, expect, type Page } from '@playwright/test';

// Weighted journey progress (exterior has weight 2 of 5): room midpoints.
const ROOM_MIDS = [0.2, 0.5, 0.7, 0.9];

// Frame-load noise we tolerate; everything else fails the suite.
const IGNORED_CONSOLE = [/favicon/i];

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error' && !IGNORED_CONSOLE.some((re) => re.test(m.text())))
      errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

async function waitForBoot(page: Page) {
  await page.goto('/');
  // Loader must remove itself once the boot frames decode (or on the no-scrub path).
  await page.waitForFunction(() => !document.getElementById('loader'), null, { timeout: 10_000 });
}

async function scrollToProgress(page: Page, p: number) {
  await page.evaluate((prog) => {
    const inner = document.querySelector<HTMLElement>('.journey-inner');
    if (!inner) return;
    const scrollable = inner.offsetHeight - window.innerHeight;
    const y = inner.getBoundingClientRect().top + window.scrollY + prog * scrollable;
    const lenis = (window as unknown as { __lenis?: { scrollTo: (y: number, o: object) => void } })
      .__lenis;
    if (lenis) lenis.scrollTo(y, { immediate: true });
    else window.scrollTo(0, y);
  }, p);
  await page.waitForTimeout(600); // let the rAF loop render + decode
}

const captionOpacities = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('.caption')].map((c) => Number(getComputedStyle(c).opacity)),
  );

test.describe('scrub journey', () => {
  test('boots with no console errors and paints the canvas', async ({ page }) => {
    const errors = collectErrors(page);
    await waitForBoot(page);
    await expect(page.locator('html')).toHaveClass(/has-scrub/);
    await page.waitForTimeout(800);
    const painted = await page.evaluate(() => {
      const canvas = document.getElementById('frameCanvas') as HTMLCanvasElement;
      const ctx = canvas.getContext('2d')!;
      const { data } = ctx.getImageData(
        Math.floor(canvas.width / 2),
        Math.floor(canvas.height * 0.7),
        1,
        1,
      );
      // navy --cine-bg is (8, 26, 40); a painted frame differs substantially
      return Math.abs(data[0] - 8) + Math.abs(data[1] - 26) + Math.abs(data[2] - 40) > 30;
    });
    expect(painted, 'canvas center should show a frame, not the background').toBe(true);
    expect(errors).toEqual([]);
  });

  test('each room shows its caption and progress dot', async ({ page }) => {
    await waitForBoot(page);
    for (let room = 0; room < 4; room++) {
      await scrollToProgress(page, ROOM_MIDS[room]);
      const ops = await captionOpacities(page);
      expect(ops[room], `caption ${room} visible at its midpoint`).toBeGreaterThan(0.5);
      ops.forEach((o, i) => {
        if (i !== room) expect(o, `caption ${i} hidden at room ${room} midpoint`).toBeLessThan(0.1);
      });
      const activeDot = await page.evaluate(() =>
        [...document.querySelectorAll('.progress-dot')].findIndex((d) =>
          d.classList.contains('is-active'),
        ),
      );
      expect(activeDot).toBe(room);
    }
  });

  test('hero logo holds at the top and clears by the door', async ({ page, viewport }) => {
    test.skip(viewport!.width < viewport!.height, 'hero logo is desktop-only');
    await waitForBoot(page);
    const logoOpacity = () =>
      page.evaluate(() => Number(getComputedStyle(document.getElementById('heroLogo')!).opacity));
    expect(await logoOpacity()).toBeGreaterThan(0.9);
    await scrollToProgress(page, 0.2); // past DOOR (0.48 of room 0 = 0.192 progress)
    expect(await logoOpacity()).toBeLessThan(0.05);
  });

  test('portrait mode: band set and first caption visible at scroll 0', async ({
    page,
    viewport,
  }) => {
    test.skip(viewport!.width >= viewport!.height, 'portrait-only checks');
    await waitForBoot(page);
    await expect(page.locator('html')).toHaveClass(/is-portrait/);
    const bandH = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--band-h'),
    );
    expect(bandH.trim()).toMatch(/px$/);
    const ops = await captionOpacities(page);
    expect(ops[0], 'first caption visible from scroll 0 on portrait').toBeGreaterThan(0.5);
  });
});
