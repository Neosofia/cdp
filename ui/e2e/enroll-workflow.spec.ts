import { expect, test } from '@playwright/test';

import { loginAsClinician } from './helpers/auth';
import { DEFAULT_E2E_PROCEDURE, enrollNewPatientViaUi, uniqueEnrollPatient } from './helpers/enroll';
import { E2E_SPEC_TRACE } from './helpers/specTraceability';

const trace = E2E_SPEC_TRACE['enroll-workflow.spec.ts'];

test.describe(trace.summary, () => {
  test.beforeEach(async ({ page }) => {
    await loginAsClinician(page);
  });

  test('clinician enrolls a new patient in post-care monitoring', async ({ page }) => {
    const patient = uniqueEnrollPatient();
    await enrollNewPatientViaUi(page, patient);

    const search = page.getByRole('textbox', { name: 'Search patients…' });
    await search.fill(patient.displayCode);

    const patientRow = page.locator('li').filter({ hasText: patient.displayCode });
    await expect(patientRow).toBeVisible({ timeout: 60_000 });
    await expect(patientRow).toContainText(`${patient.firstName} ${patient.lastName}`);
    await expect(patientRow).toContainText(DEFAULT_E2E_PROCEDURE);
  });
});
