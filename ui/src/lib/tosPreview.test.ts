import { describe, expect, it } from 'vitest';
import { isTosPreviewPath, TOS_PREVIEW_PATH } from '@/lib/tosPreview';

describe('tosPreview', () => {
  it('exports the preview path', () => {
    expect(TOS_PREVIEW_PATH).toBe('/tos-preview');
  });

  it('matches only the preview path', () => {
    expect(isTosPreviewPath('/tos-preview')).toBe(true);
    expect(isTosPreviewPath('/')).toBe(false);
    expect(isTosPreviewPath('/patient/chat')).toBe(false);
  });
});
