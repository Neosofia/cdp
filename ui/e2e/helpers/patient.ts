import { expect, type Page } from '@playwright/test';

import { e2eEnv } from './env';

async function waitForCareEpisodeList(page: Page): Promise<void> {
  await page.waitForResponse(
    (response) =>
      /\/api\/v1\/care-episodes(\?|$)/.test(response.url()) && response.ok(),
  );
}

/** Open a patient session from the roster by display code. */
export async function openPatientSession(page: Page, displayCode: string): Promise<void> {
  await page.goto('/clinician/patients?episode=all');
  await page.getByPlaceholder('Search patients…').waitFor({ state: 'visible', timeout: 60_000 });

  const listLoaded = waitForCareEpisodeList(page);
  await page.getByPlaceholder('Search patients…').fill(displayCode);
  await listLoaded;

  const patientRow = page.locator('li').filter({ hasText: displayCode });
  await expect(patientRow).toBeVisible({ timeout: 60_000 });

  const episodesLoaded = page.waitForResponse(
    (response) =>
      /\/api\/v1\/care-episodes\/[^/]+\/episodes$/.test(response.url()) && response.ok(),
  );
  await patientRow.getByRole('button').first().click();
  await episodesLoaded;
}

/**
 * Open a catalog patient from the seeded demo roster (`seed_demo_platform.py`).
 * Requires `E2E_PATIENT_DISPLAY_CODE` (default DEMO-123) to exist in the target environment.
 */
export async function openCatalogPatient(page: Page): Promise<void> {
  await openPatientSession(page, e2eEnv.patientDisplayCode);

  const closeEpisode = page.getByRole('button', { name: 'Close episode' });
  const reopenEpisode = page.getByRole('button', { name: 'Reopen episode' });
  const episodeSelect = page.getByRole('combobox', { name: 'Care episode' });
  await expect(closeEpisode.or(reopenEpisode).or(episodeSelect).first()).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByText('No care episode to close')).not.toBeVisible();
}
