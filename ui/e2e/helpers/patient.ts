import { expect, type Page } from '@playwright/test';

import { e2eEnv } from './env';

/** Open a catalog patient seeded by `cdp/scripts/seed_demo_platform.py`. */
export async function openCatalogPatient(page: Page): Promise<void> {
  await page.goto('/clinician/patients');

  const search = page.getByRole('textbox', { name: 'Search patients…' });
  await search.fill(e2eEnv.patientDisplayCode);

  const patientRow = page.locator('li').filter({ hasText: e2eEnv.patientDisplayCode });
  await expect(patientRow).toBeVisible({ timeout: 60_000 });

  const episodesLoaded = page.waitForResponse(
    (response) =>
      /\/api\/v1\/care-episodes\/[^/]+\/episodes$/.test(response.url()) && response.ok(),
  );
  await patientRow.getByRole('button').first().click();
  await episodesLoaded;

  const closeEpisode = page.getByRole('button', { name: 'Close episode' });
  const reopenEpisode = page.getByRole('button', { name: 'Reopen episode' });
  const episodeSelect = page.getByRole('combobox', { name: 'Care episode' });
  await expect(closeEpisode.or(reopenEpisode).or(episodeSelect).first()).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByText('No care episode to close')).not.toBeVisible();
}
