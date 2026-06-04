import { describe, expect, it } from 'vitest';
import { getUiVersion, UI_RELEASE_VERSION } from './uiVersion';

describe('getUiVersion', () => {
  it('returns the hardcoded CalVer release id', () => {
    expect(getUiVersion()).toBe(UI_RELEASE_VERSION);
    expect(UI_RELEASE_VERSION).toMatch(/^\d{4}\.\d{2}\.\d{2}$/);
  });
});
