import { expect, test } from '@playwright/test';

import { loginAsClinician } from './helpers/auth';
import { E2E_SPEC_TRACE } from './helpers/specTraceability';
import { enrollNewPatientViaUi, uniqueEnrollPatient } from './helpers/enroll';
import { openPatientSession } from './helpers/patient';

const trace = E2E_SPEC_TRACE['care-episode-lifecycle.spec.ts'];

test.describe(trace.summary, () => {
  test.beforeEach(async ({ page }) => {
    await loginAsClinician(page);
  });

  test('clinician closes then reopens the active care episode', async ({ page }) => {
    const patient = uniqueEnrollPatient();
    await enrollNewPatientViaUi(page, patient);
    await openPatientSession(page, patient.displayCode);

    const closeButton = page.getByRole('button', { name: 'Close episode' });
    const reopenButton = page.getByRole('button', { name: 'Reopen episode' });

    await expect(closeButton).toBeEnabled({ timeout: 30_000 });

    await closeButton.click();
    await expect(reopenButton).toBeEnabled({ timeout: 30_000 });
    await expect(closeButton).toHaveCount(0);

    await reopenButton.click();
    await expect(closeButton).toBeEnabled({ timeout: 30_000 });
  });
});
