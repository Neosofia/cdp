import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  badgeForReachability,
  fetchPlatformServiceHealth,
  formatServiceHealthPrimary,
  formatServiceHealthSecondary,
  summarizeServiceHealth,
  type ServiceHealthRow,
} from '@/lib/serviceHealth';

describe('serviceHealth', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('summarizes reachability counts', () => {
    const rows: ServiceHealthRow[] = [
      {
        id: 'authentication',
        label: 'authentication',
        baseUrl: 'http://localhost:8014',
        reachability: 'healthy',
        healthStatus: 'ok',
        version: '0.32.0',
        detail: null,
        latencyMs: 10,
        checkedAt: null,
        errorMessage: null,
      },
      {
        id: 'chat',
        label: 'chat',
        baseUrl: null,
        reachability: 'not_configured',
        healthStatus: null,
        version: null,
        detail: null,
        latencyMs: null,
        checkedAt: null,
        errorMessage: null,
      },
    ];
    expect(summarizeServiceHealth(rows)).toMatchObject({
      configured: 1,
      healthy: 1,
      notConfigured: 1,
    });
  });

  it('formats primary line with version in parentheses', () => {
    const row: ServiceHealthRow = {
      id: 'user',
      label: 'user',
      baseUrl: 'http://localhost:8018',
      reachability: 'healthy',
      healthStatus: 'ok',
      version: '0.6.3',
      detail: null,
      latencyMs: 24,
      checkedAt: null,
      errorMessage: null,
    };
    expect(formatServiceHealthPrimary(row)).toBe('user (0.6.3)');
    expect(formatServiceHealthSecondary(row)).toBe('24 ms');
  });

  it('treats placeholder 0.0.0 version as missing', async () => {
    vi.stubEnv('VITE_AUTH_API_URL', 'http://auth.test');
    vi.stubEnv('VITE_USER_API_URL', '');
    vi.stubEnv('VITE_CAPABILITIES_API_URL', '');
    vi.stubEnv('VITE_CHAT_API_URL', '');
    vi.stubEnv('VITE_CARE_EPISODE_API_URL', '');
    vi.stubEnv('VITE_TEMPLATE_API_URL', '');

    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ status: 'ok', version: '0.0.0' }), { status: 200 }),
      ),
    );

    const [row] = await fetchPlatformServiceHealth();
    expect(row.version).toBeNull();
    expect(row.reachability).toBe('healthy');
  });

  it('fetches health from configured service bases', async () => {
    vi.stubEnv('VITE_AUTH_API_URL', 'http://auth.test');
    vi.stubEnv('VITE_USER_API_URL', '');
    vi.stubEnv('VITE_CAPABILITIES_API_URL', '');
    vi.stubEnv('VITE_CHAT_API_URL', '');
    vi.stubEnv('VITE_CARE_EPISODE_API_URL', '');
    vi.stubEnv('VITE_TEMPLATE_API_URL', '');

    const fetchMock = vi.fn(async (url: string) => {
      if (url === 'http://auth.test/health') {
        return new Response(JSON.stringify({ status: 'ok', version: '1.2.3' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      throw new Error('unexpected url');
    });
    vi.stubGlobal('fetch', fetchMock);

    const rows = await fetchPlatformServiceHealth();
    const auth = rows.find((r) => r.id === 'authentication');
    expect(auth?.reachability).toBe('healthy');
    expect(auth?.version).toBe('1.2.3');
    expect(rows.filter((r) => r.reachability === 'not_configured')).toHaveLength(5);
  });

  it('maps degraded health status', () => {
    expect(badgeForReachability('degraded').label).toBe('Degraded');
  });
});
