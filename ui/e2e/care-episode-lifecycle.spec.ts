import { expect, test } from '@playwright/test';

import { loginAsClinician } from './helpers/auth';
import { openCatalogPatient } from './helpers/patient';

async function ensureCurrentEpisodeSelected(page: import('@playwright/test').Page): Promise<void> {
  const episodeSelect = page.getByRole('combobox', { name: 'Care episode' });
  if (!(await episodeSelect.isVisible().catch(() => false))) {
    return;
  }
  const selectedValue = await episodeSelect.inputValue();
  const selectedLabel = await episodeSelect.locator(`option[value="${selectedValue}"]`).textContent();
  if (selectedLabel?.includes('Current')) {
    return;
  }
  const currentOption = episodeSelect.locator('option').filter({ hasText: 'Current' }).first();
  const currentValue = await currentOption.getAttribute('value');
  if (currentValue) {
    await episodeSelect.selectOption(currentValue);
  }
}

test.describe('care episode lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsClinician(page);
  });

  test('clinician closes then reopens the active care episode', async ({ page }) => {
    await openCatalogPatient(page);
    await ensureCurrentEpisodeSelected(page);

    const closeButton = page.getByRole('button', { name: 'Close episode' });
    const reopenButton = page.getByRole('button', { name: 'Reopen episode' });

    if (await reopenButton.isVisible().catch(() => false)) {
      await reopenButton.click();
      await expect(closeButton).toBeEnabled({ timeout: 30_000 });
    }

    await closeButton.click();
    await expect(reopenButton).toBeEnabled({ timeout: 30_000 });
    await expect(closeButton).toHaveCount(0);

    await reopenButton.click();
    await expect(closeButton).toBeEnabled({ timeout: 30_000 });
    const episodeSelect = page.getByRole('combobox', { name: 'Care episode' });
    if (await episodeSelect.isVisible().catch(() => false)) {
      await expect(episodeSelect).toContainText(/Current/i);
    }
  });
});
