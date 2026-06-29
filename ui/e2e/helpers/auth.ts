import { expect, type Page } from '@playwright/test';

import { e2eEnv } from './env';

const appHost = new URL(e2eEnv.baseUrl).host;

function isAppShellUrl(url: URL): boolean {
  return url.host === appHost && !url.pathname.includes('organization-selection');
}

async function acceptTermsIfPresent(page: Page): Promise<void> {
  const agreeButton = page.getByRole('button', { name: 'I Agree — Continue' });
  if (await agreeButton.isVisible().catch(() => false)) {
    await page.getByRole('checkbox').check();
    await agreeButton.click();
  }
}

export async function loginThroughWorkOs(page: Page): Promise<void> {
  await page.goto(`${e2eEnv.authBaseUrl}/login`);

  const emailField = page.getByRole('textbox', { name: 'Email' });
  await emailField.waitFor({ state: 'visible', timeout: 60_000 });
  await emailField.fill(e2eEnv.email());
  await page.getByRole('button', { name: 'Continue' }).click();

  const passwordField = page.getByRole('textbox', { name: 'Password' });
  await passwordField.waitFor({ state: 'visible', timeout: 60_000 });
  await passwordField.fill(e2eEnv.password());
  await page.getByRole('button', { name: 'Sign in' }).click();

  await page.waitForURL(
    (url) => url.pathname.includes('organization-selection') || isAppShellUrl(url),
    { timeout: 60_000 },
  );
  if (page.url().includes('organization-selection')) {
    const orgButton = page.getByRole('button', { name: e2eEnv.workosOrg, exact: true });
    await orgButton.waitFor({ state: 'visible', timeout: 30_000 });
    await orgButton.click();
  }

  await page.waitForURL(isAppShellUrl, { timeout: 90_000 });
  await acceptTermsIfPresent(page);
}

export async function ensureClinicianRole(page: Page): Promise<void> {
  const accountMenu = page.getByRole('button', { name: /Ben Young/i });
  const headerRole = accountMenu.getByText(e2eEnv.clinicianRoleLabel, { exact: true });
  if (await headerRole.isVisible().catch(() => false)) {
    return;
  }

  await accountMenu.click();
  await page.getByRole('group', { name: 'Choose your role' }).waitFor({ state: 'visible' });

  const activeRole = page.getByRole('menuitem', {
    name: `${e2eEnv.clinicianRoleLabel} Active`,
    exact: true,
  });
  if (await activeRole.isVisible().catch(() => false)) {
    await page.keyboard.press('Escape');
    return;
  }

  await page.getByRole('menuitem', { name: e2eEnv.clinicianRoleLabel, exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'breadcrumb' })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText('High-risk alerts')).toBeVisible({ timeout: 30_000 });
}

export async function loginAsClinician(page: Page): Promise<void> {
  await loginThroughWorkOs(page);
  await ensureClinicianRole(page);
}

export async function ensurePatientRole(page: Page): Promise<void> {
  const accountMenu = page.getByRole('button', { name: /Ben Young/i });
  await accountMenu.click();

  const activeRole = page.getByRole('menuitem', {
    name: `${e2eEnv.patientRoleLabel} Active`,
    exact: true,
  });
  if (await activeRole.isVisible().catch(() => false)) {
    await page.keyboard.press('Escape');
    return;
  }

  await page.getByRole('menuitem', { name: e2eEnv.patientRoleLabel, exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: /Ben Young/i })).toBeVisible({ timeout: 30_000 });
}
