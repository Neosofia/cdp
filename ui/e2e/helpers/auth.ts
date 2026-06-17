import { expect, type Page } from '@playwright/test';

import { e2eEnv } from './env';

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

  await page.waitForURL(/organization-selection|localhost:5173/, { timeout: 60_000 });
  if (/organization-selection/.test(page.url())) {
    const orgButton = page.getByRole('button', { name: e2eEnv.workosOrg, exact: true });
    await orgButton.waitFor({ state: 'visible', timeout: 30_000 });
    await orgButton.click();
  }

  await page.waitForURL(/localhost:5173/, { timeout: 90_000 });
  await acceptTermsIfPresent(page);
}

export async function ensureClinicianRole(page: Page): Promise<void> {
  const profileTrigger = page.getByRole('button', { name: new RegExp(e2eEnv.clinicianRoleLabel, 'i') });
  if (await profileTrigger.isVisible().catch(() => false)) {
    return;
  }

  const accountMenu = page.getByRole('button', { name: /Young/i });
  await accountMenu.click();
  const roleItem = page.getByRole('menuitem', { name: e2eEnv.clinicianRoleLabel, exact: true });
  await roleItem.waitFor({ state: 'visible', timeout: 30_000 });
  await roleItem.click();
  await expect(profileTrigger).toBeVisible();
}

export async function loginAsClinician(page: Page): Promise<void> {
  await loginThroughWorkOs(page);
  await ensureClinicianRole(page);
}
