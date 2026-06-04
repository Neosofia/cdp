import {
  healthCheckUrl,
  PLATFORM_SERVICES,
  type PlatformServiceDefinition,
  type PlatformServiceId,
} from '@/lib/platformServices';

const HEALTH_PROBE_TIMEOUT_MS = 8_000;

export type ServiceReachability =
  | 'healthy'
  | 'degraded'
  | 'unhealthy'
  | 'unreachable'
  | 'not_configured';

export type ServiceHealthRow = {
  id: PlatformServiceId;
  label: string;
  baseUrl: string | null;
  reachability: ServiceReachability;
  /** Raw `status` from JSON when parse succeeded */
  healthStatus: string | null;
  version: string | null;
  detail: string | null;
  latencyMs: number | null;
  checkedAt: string | null;
  errorMessage: string | null;
};

type HealthJson = {
  status?: string;
  version?: string;
  detail?: string;
};

function reachabilityFromStatus(
  httpOk: boolean,
  status: string | null,
): ServiceReachability {
  if (!httpOk) return 'unhealthy';
  if (status === 'ok') return 'healthy';
  if (status === 'degraded') return 'degraded';
  if (status === 'error') return 'unhealthy';
  return 'unhealthy';
}

export function badgeForReachability(
  reachability: ServiceReachability,
): { label: string; color: 'green' | 'yellow' | 'red' | 'cyan' } {
  switch (reachability) {
    case 'healthy':
      return { label: 'Healthy', color: 'green' };
    case 'degraded':
      return { label: 'Degraded', color: 'yellow' };
    case 'unhealthy':
      return { label: 'Unhealthy', color: 'red' };
    case 'not_configured':
      return { label: 'Not configured', color: 'cyan' };
    default:
      return { label: 'Unreachable', color: 'red' };
  }
}

async function probeOne(def: PlatformServiceDefinition): Promise<ServiceHealthRow> {
  const baseUrl = def.resolveApiBase();
  const checkedAt = new Date().toISOString();

  if (!baseUrl) {
    return {
      id: def.id,
      label: def.label,
      baseUrl: null,
      reachability: 'not_configured',
      healthStatus: null,
      version: null,
      detail: null,
      latencyMs: null,
      checkedAt,
      errorMessage: 'VITE_* API URL not set for this service',
    };
  }

  const url = healthCheckUrl(baseUrl);
  const started = performance.now();

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(HEALTH_PROBE_TIMEOUT_MS),
    });
    const latencyMs = Math.round(performance.now() - started);

    let body: HealthJson | null = null;
    try {
      body = (await response.json()) as HealthJson;
    } catch {
      body = null;
    }

    const healthStatus = typeof body?.status === 'string' ? body.status : null;
    const rawVersion = typeof body?.version === 'string' ? body.version.trim() : null;
    const version =
      rawVersion && rawVersion !== '0.0.0' ? rawVersion : rawVersion === '0.0.0' ? null : null;
    const detail = typeof body?.detail === 'string' ? body.detail : null;

    if (!body?.status) {
      return {
        id: def.id,
        label: def.label,
        baseUrl,
        reachability: 'unhealthy',
        healthStatus,
        version,
        detail,
        latencyMs,
        checkedAt,
        errorMessage: response.ok
          ? 'Health response missing status field'
          : `HTTP ${response.status}`,
      };
    }

    return {
      id: def.id,
      label: def.label,
      baseUrl,
      reachability: reachabilityFromStatus(response.ok, healthStatus),
      healthStatus,
      version,
      detail,
      latencyMs,
      checkedAt,
      errorMessage: response.ok ? null : `HTTP ${response.status}`,
    };
  } catch (err) {
    const latencyMs = Math.round(performance.now() - started);
    const message = err instanceof Error ? err.message : 'Health check failed';
    return {
      id: def.id,
      label: def.label,
      baseUrl,
      reachability: 'unreachable',
      healthStatus: null,
      version: null,
      detail: null,
      latencyMs,
      checkedAt,
      errorMessage: message,
    };
  }
}

export async function fetchPlatformServiceHealth(): Promise<ServiceHealthRow[]> {
  return Promise.all(PLATFORM_SERVICES.map((def) => probeOne(def)));
}

export function summarizeServiceHealth(rows: ServiceHealthRow[]): {
  configured: number;
  healthy: number;
  degraded: number;
  unhealthy: number;
  unreachable: number;
  notConfigured: number;
} {
  let healthy = 0;
  let degraded = 0;
  let unhealthy = 0;
  let unreachable = 0;
  let notConfigured = 0;
  let configured = 0;

  for (const row of rows) {
    if (row.reachability === 'not_configured') {
      notConfigured += 1;
      continue;
    }
    configured += 1;
    switch (row.reachability) {
      case 'healthy':
        healthy += 1;
        break;
      case 'degraded':
        degraded += 1;
        break;
      case 'unhealthy':
        unhealthy += 1;
        break;
      case 'unreachable':
        unreachable += 1;
        break;
      default:
        break;
    }
  }

  return { configured, healthy, degraded, unhealthy, unreachable, notConfigured };
}

export function formatServiceHealthPrimary(row: ServiceHealthRow): string {
  if (!row.version) {
    return row.label;
  }
  const semver = row.version.replace(/^v/i, '');
  return `${row.label} (${semver})`;
}

export function formatServiceHealthSecondary(row: ServiceHealthRow): string {
  if (row.reachability === 'not_configured') {
    return 'Set the VITE_* API URL in the UI build environment';
  }
  const parts: string[] = [];
  if (row.latencyMs != null) {
    parts.push(`${row.latencyMs} ms`);
  }
  if (row.detail) {
    parts.push(row.detail);
  }
  if (row.errorMessage && row.reachability !== 'healthy' && row.reachability !== 'degraded') {
    parts.push(row.errorMessage);
  }
  if (parts.length === 0 && row.baseUrl) {
    parts.push(row.baseUrl);
  }
  return parts.join(' · ');
}
