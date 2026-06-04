import { afterEach, describe, expect, it, vi } from 'vitest';
import { isTosPreviewPath, TOS_PREVIEW_PATH } from '@/lib/tosPreview';

describe('tosPreview', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('exports the preview path', () => {
    expect(TOS_PREVIEW_PATH).toBe('/tos-preview');
  });

  it('matches only the preview path in dev', () => {
    vi.stubEnv('DEV', true);
    expect(isTosPreviewPath('/tos-preview')).toBe(true);
    expect(isTosPreviewPath('/')).toBe(false);
  });

  it('never matches in production builds', () => {
    vi.stubEnv('DEV', false);
    expect(isTosPreviewPath('/tos-preview')).toBe(false);
  });
});
