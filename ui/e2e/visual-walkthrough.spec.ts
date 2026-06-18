import { expect, test, type Page } from '@playwright/test';

import { ensurePatientRole, loginAsClinician } from './helpers/auth';
import { e2eEnv } from './helpers/env';
import {
  clickAppNavButton,
  goToAppDashboard,
  openClinicianPatients,
  waitForAppSheetClosed,
  waitForAppSheetReady,
} from './helpers/nav';
import {
  captureWalkthroughStep,
  clickEnrollPatient,
  closeFiltersAfterWalkthrough,
  generateWalkthroughGallery,
  openFiltersForWalkthrough,
  patientRow,
  selectPatientFromRow,
  shouldRunWalkthroughMode,
  WALKTHROUGH_STEPS,
  walkthroughModeFromTestInfo,
  type WalkthroughMode,
} from './helpers/walkthrough';

async function expectClinicianDashboardReady(page: Page): Promise<void> {
  await expect(page.getByRole('navigation', { name: 'breadcrumb' })).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByRole('navigation', { name: 'breadcrumb' }).getByText('Dashboard', { exact: true })).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByText('High-risk alerts')).toBeVisible({ timeout: 60_000 });
}

async function expectPatientDashboardReady(page: Page): Promise<void> {
  await expect(page.getByRole('navigation', { name: 'breadcrumb' })).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByRole('navigation', { name: 'breadcrumb' }).getByText('Dashboard', { exact: true })).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByText('Loading your care overview…')).toBeHidden({ timeout: 60_000 });
  await expect(page.getByText(/Welcome back/i)).toBeVisible({ timeout: 60_000 });
}

async function expectPatientChatReady(page: Page, mode: WalkthroughMode) {
  await expect(page.getByRole('button', { name: 'New' })).toBeVisible({
    timeout: 60_000,
  });
  if (mode === 'mobile') {
    await expect(page.getByRole('button', { name: 'Conversations' })).toBeVisible();
  }
  await expect(page.getByText('Loading your conversation…')).toBeHidden({ timeout: 60_000 });
}

test.describe('visual walkthrough', () => {
  test.afterAll(() => {
    generateWalkthroughGallery();
  });

  test('capture dashboards through chat flow', async ({ page }, testInfo) => {
    test.setTimeout(210_000);

    const mode = walkthroughModeFromTestInfo(testInfo);
    test.skip(mode === null, 'Run with --project=mobile-chromium and/or --project=desktop-chromium');
    test.skip(!shouldRunWalkthroughMode(mode!), `Skipped by E2E_WALKTHROUGH_MODE filter`);

    const step = (index: number) => WALKTHROUGH_STEPS[index]!;

    await loginAsClinician(page);
    await goToAppDashboard(page);
    await expectClinicianDashboardReady(page);
    await captureWalkthroughStep(page, mode!, step(0));

    await openClinicianPatients(page);
    await captureWalkthroughStep(page, mode!, step(1));

    if (mode === 'mobile' && step(1).mobileExtra) {
      await openFiltersForWalkthrough(page, mode!);
      await captureWalkthroughStep(page, mode!, step(1), step(1).mobileExtra!.suffix);
      await closeFiltersAfterWalkthrough(page, mode!);
    }

    await clickEnrollPatient(page);
    await page.getByRole('heading', { name: 'Enroll in post-care monitoring' }).waitFor();
    await waitForAppSheetReady(page);
    await captureWalkthroughStep(page, mode!, step(2));

    await page.getByRole('button', { name: 'New patient' }).click();
    await waitForAppSheetReady(page);
    await captureWalkthroughStep(page, mode!, step(3));

    await page.keyboard.press('Escape');
    await waitForAppSheetClosed(page);
    await openFiltersForWalkthrough(page, mode!);
    await captureWalkthroughStep(page, mode!, step(4));
    await closeFiltersAfterWalkthrough(page, mode!);

    await page.getByPlaceholder('Search patients…').fill(e2eEnv.patientDisplayCode);
    const demoPatientRow = patientRow(page, e2eEnv.patientDisplayCode);
    await demoPatientRow.waitFor({ state: 'visible', timeout: 60_000 });
    await captureWalkthroughStep(page, mode!, step(5));

    await demoPatientRow.getByRole('button', { name: /Edit patient profile/i }).first().click();
    await page.getByRole('heading', { name: 'Edit patient' }).waitFor();
    await waitForAppSheetReady(page);
    await captureWalkthroughStep(page, mode!, step(6));

    await page.keyboard.press('Escape');
    await waitForAppSheetClosed(page);

    const riskSummaryControl =
      mode === 'desktop'
        ? demoPatientRow.locator('.hidden.md\\:grid [data-risk-summary-hint="desktop"]')
        : demoPatientRow.getByRole('button', { name: 'AI interaction summary', exact: true });
    await expect(riskSummaryControl).toBeVisible({ timeout: 60_000 });
    if (mode === 'desktop') {
      await riskSummaryControl.scrollIntoViewIfNeeded();
      await riskSummaryControl.hover();
      await expect(page.getByRole('tooltip')).toBeVisible();
      await captureWalkthroughStep(page, mode!, step(7));
      await page.mouse.move(0, 0);
    } else {
      await riskSummaryControl.click();
      await expect(page.getByRole('dialog', { name: 'AI interaction summary' })).toBeVisible();
      await captureWalkthroughStep(page, mode!, step(7));
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog', { name: 'AI interaction summary' })).toBeHidden();
    }

    const episodesLoaded = page.waitForResponse(
      (response) =>
        /\/api\/v1\/care-episodes\/[^/]+\/episodes$/.test(response.url()) && response.ok(),
    );
    await selectPatientFromRow(demoPatientRow);
    await episodesLoaded;
    await expect(page.locator('[data-slot="card-title"]').filter({ hasText: 'Patient chat' })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByText('Loading chat transcript…')).toBeHidden({ timeout: 60_000 });
    await expect(page.getByText(/gallbladder|sharp pain|Hi -/i).first()).toBeVisible({
      timeout: 60_000,
    });
    await captureWalkthroughStep(page, mode!, step(8));

    await ensurePatientRole(page);
    await goToAppDashboard(page);
    await expectPatientDashboardReady(page);
    await captureWalkthroughStep(page, mode!, step(9));

    await clickAppNavButton(page, 'Chat');
    await expectPatientChatReady(page, mode!);
    await captureWalkthroughStep(page, mode!, step(10));

    if (mode === 'mobile' && step(10).mobileExtra) {
      await page.getByRole('button', { name: 'Conversations' }).click();
      await expect(page.getByRole('heading', { name: 'Prior conversations' })).toBeVisible();
      await waitForAppSheetReady(page);
      await captureWalkthroughStep(page, mode!, step(10), step(10).mobileExtra!.suffix);
      await page.keyboard.press('Escape');
      await expect(page.getByRole('heading', { name: 'Prior conversations' })).toBeHidden();
    }
  });
});
