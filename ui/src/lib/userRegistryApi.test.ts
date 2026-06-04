import { afterEach, describe, expect, it, vi } from 'vitest';
import { acceptTermsOfService, fetchUserRegistryTotal } from '@/lib/userRegistryApi';

describe('fetchUserRegistryTotal', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns total from user list response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [{}], total: 42, page: 1, page_size: 1 }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const summary = await fetchUserRegistryTotal('tok', 'operator');
    expect(summary.total).toBe(42);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/users?page=1&page_size=1'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer tok',
          'X-Active-Actor': 'operator',
        }),
      }),
    );
  });

  it('throws when the user service returns an error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ message: 'forbidden' }),
      }),
    );

    await expect(fetchUserRegistryTotal('tok', 'operator')).rejects.toThrow('forbidden');
  });
});

describe('acceptTermsOfService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('PATCHes tos_accepted true on the user record', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        uuid: '00000000-0000-7000-8000-000000000002',
        tos_accepted: true,
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const user = await acceptTermsOfService(
      'tok',
      'operator',
      '00000000-0000-7000-8000-000000000002',
      'admin',
    );
    expect(user.tos_accepted).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/users/00000000-0000-7000-8000-000000000002'),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ tos_accepted: true }),
        headers: expect.objectContaining({
          Authorization: 'Bearer tok',
          'X-Active-Actor': 'operator',
          'X-Active-Org-Role': 'admin',
        }),
      }),
    );
  });

  it('throws when PATCH succeeds but tos_accepted stays false', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          uuid: '00000000-0000-7000-8000-000000000002',
          tos_accepted: false,
        }),
      }),
    );

    await expect(
      acceptTermsOfService('tok', 'operator', '00000000-0000-7000-8000-000000000002', 'admin'),
    ).rejects.toThrow(/not saved/i);
  });
});
