import { expect, test, type APIResponse, type Page } from '@playwright/test';

import { loginAsClinician } from './helpers/auth';
import { uniqueEnrollPatient } from './helpers/enroll';

async function waitForSuccessfulPost(
  page: Page,
  urlPattern: RegExp,
  timeoutMs = 30_000,
): Promise<APIResponse> {
  const matches: APIResponse[] = [];
  const onResponse = (response: APIResponse) => {
    if (urlPattern.test(response.url()) && response.request().method() === 'POST') {
      matches.push(response);
    }
  };
  page.on('response', onResponse);
  try {
    await expect.poll(
      () => matches.find((response) => response.ok()),
      { timeout: timeoutMs, message: `Expected successful POST ${urlPattern}` },
    ).toBeTruthy();
    return matches.find((response) => response.ok())!;
  } catch {
    const sheetError = await page.locator('[role="dialog"] p.text-red-400').textContent().catch(() => null);
    const lastStatus = matches.at(-1)?.status();
    throw new Error(
      sheetError
        ?? `POST ${urlPattern} did not succeed (last status: ${lastStatus ?? 'no response'})`,
    );
  } finally {
    page.off('response', onResponse);
  }
}

test.describe('enroll workflow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsClinician(page);
  });

  test('clinician enrolls a new patient in post-care monitoring', async ({ page }) => {
    const patient = uniqueEnrollPatient();
    const procedureName = 'Laparoscopic cholecystectomy';

    await page.goto('/clinician/patients');
    await page.getByRole('button', { name: 'Enroll' }).click();
    await expect(page.getByRole('heading', { name: 'Enroll in post-care monitoring' })).toBeVisible();

    await page.getByRole('button', { name: 'New patient' }).click();
    await page.getByPlaceholder('Display code (e.g. PAT-4821)').fill('');
    await page.getByPlaceholder('Display code (e.g. PAT-4821)').fill(patient.displayCode);
    await page.getByPlaceholder('First name').fill(patient.firstName);
    await page.getByPlaceholder('Last name').fill(patient.lastName);
    await page.getByPlaceholder('Email address').fill(patient.email);
    await expect(page.getByPlaceholder('Display code (e.g. PAT-4821)')).toHaveValue(patient.displayCode);

    await page.getByRole('listbox', { name: 'Procedure catalog' }).getByRole('option', {
      name: procedureName,
    }).click();

    const userWait = waitForSuccessfulPost(page, /\/api\/v1\/users$/);
    const episodeWait = waitForSuccessfulPost(page, /\/api\/v1\/care-episodes$/);

    await page.getByRole('button', { name: 'Start post-care monitoring' }).click();

    await userWait;
    const episodeResponse = await episodeWait;

    const episodeBody = await episodeResponse.json();
    expect(episodeBody.episode_uuid).toBeTruthy();

    await expect(page.getByRole('heading', { name: 'Enroll in post-care monitoring' })).not.toBeVisible({
      timeout: 30_000,
    });

    const search = page.getByRole('textbox', { name: 'Search patients…' });
    await search.fill(patient.displayCode);

    const patientRow = page.locator('li').filter({ hasText: patient.displayCode });
    await expect(patientRow).toBeVisible({ timeout: 60_000 });
    await expect(patientRow).toContainText(`${patient.firstName} ${patient.lastName}`);
    await expect(patientRow).toContainText(procedureName);
  });
});
