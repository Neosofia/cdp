import { expect, type Locator, type Page } from '@playwright/test';

export async function isCompactAppNavVisible(page: Page): Promise<boolean> {
  return page.evaluate(() => window.matchMedia('(max-width: 767px)').matches);
}

export async function openAppNavMenu(page: Page): Promise<void> {
  const hamburger = page.getByRole('button', { name: 'Open menu' });
  if (!(await isCompactAppNavVisible(page))) {
    return;
  }
  if (await page.getByRole('dialog', { name: 'Menu' }).isVisible().catch(() => false)) {
    return;
  }
  await hamburger.click();
  await expect(page.getByRole('dialog', { name: 'Menu' })).toBeVisible();
}

export function appNavButton(page: Page, label: string): Locator {
  const menuDialog = page.getByRole('dialog', { name: 'Menu' });
  return menuDialog
    .getByRole('button', { name: label, exact: true })
    .or(page.locator('header').getByRole('button', { name: label, exact: true }));
}

export async function clickAppNavButton(page: Page, label: string): Promise<void> {
  if (await isCompactAppNavVisible(page)) {
    await openAppNavMenu(page);
    await page.getByRole('dialog', { name: 'Menu' }).getByRole('button', { name: label, exact: true }).click();
    return;
  }
  await page.locator('header').getByRole('button', { name: label, exact: true }).click();
}

export async function goToAppDashboard(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
}

export async function openClinicianPatients(page: Page): Promise<void> {
  await clickAppNavButton(page, 'Patients');
  await page.getByPlaceholder('Search patients…').waitFor({ state: 'visible', timeout: 60_000 });
}

/** Wait until the open sheet panel is fully opaque and settled (for screenshots). */
export async function waitForAppSheetReady(page: Page): Promise<void> {
  const sheet = page.locator('[data-slot="sheet-content"][data-state="open"]');
  await sheet.waitFor();
  await page.waitForFunction(() => {
    const content = document.querySelector('[data-slot="sheet-content"][data-state="open"]');
    if (!content) return false;
    const contentStyle = getComputedStyle(content);
    const contentOpacity = Number.parseFloat(contentStyle.opacity);
    const transform = contentStyle.transform;
    const transformSettled = transform === 'none' || transform === 'matrix(1, 0, 0, 1, 0, 0)';
    const overlay = document.querySelector('[data-slot="sheet-overlay"]');
    const overlayOpacity = overlay ? Number.parseFloat(getComputedStyle(overlay).opacity) : 1;
    return contentOpacity >= 0.99 && transformSettled && overlayOpacity >= 0.65;
  });
}

/** Wait until no app sheet is mid-open (avoids capturing exit animations in screenshots). */
export async function waitForAppSheetClosed(page: Page): Promise<void> {
  const openSheet = page.locator('[data-slot="sheet-content"][data-state="open"]');
  if (await openSheet.count()) {
    await openSheet.waitFor({ state: 'hidden' });
  }
  const overlay = page.locator('[data-slot="sheet-overlay"]');
  if (await overlay.count()) {
    await overlay.waitFor({ state: 'hidden' });
  }
}
