import { expect, type APIResponse, type Page } from '@playwright/test';

import { randomBytes, randomUUID } from 'node:crypto';

export interface EnrollTestPatient {
  displayCode: string;
  firstName: string;
  lastName: string;
  email: string;
}

/** Procedure expected in the seeded catalog (`seed_demo_platform.py`). */
export const DEFAULT_E2E_PROCEDURE = 'Laparoscopic cholecystectomy';

/** Fresh patient identity for each enroll e2e run (display codes are tenant-unique). */
export function uniqueEnrollPatient(): EnrollTestPatient {
  const nonce = randomBytes(6).toString('hex').toUpperCase();
  return {
    displayCode: `E2E-${Date.now()}-${nonce}`,
    firstName: 'E2E',
    lastName: `Patient${nonce.slice(0, 6)}`,
    email: `e2e-${randomUUID()}@example.com`,
  };
}

export async function waitForSuccessfulPost(
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

/** Enroll a new patient through the clinician UI (creates user + active care episode). */
export async function enrollNewPatientViaUi(
  page: Page,
  patient: EnrollTestPatient,
  procedureName = DEFAULT_E2E_PROCEDURE,
): Promise<void> {
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
}
