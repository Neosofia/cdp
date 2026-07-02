import {
  healthCheckUrl,
  PLATFORM_SERVICES,
  type PlatformServiceDefinition,
  type PlatformServiceId,
} from '@/shared/platform/platformServices';
import { injectPlatformTraceHeaders } from '@/shared/platform/platformApiFetch';
import { toUserFacingError } from '@/shared/core/userFacingError';

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

function healthRow(
  def: PlatformServiceDefinition,
  checkedAt: string,
  row: Pick<ServiceHealthRow, 'baseUrl' | 'reachability'> &
    Partial<Omit<ServiceHealthRow, 'id' | 'label' | 'checkedAt' | 'baseUrl' | 'reachability'>>,
): ServiceHealthRow {
  return {
    id: def.id,
    label: def.label,
    checkedAt,
    healthStatus: null,
    version: null,
    detail: null,
    latencyMs: null,
    errorMessage: null,
    ...row,
  };
}

function parseHealthBody(body: HealthJson | null): Pick<
  ServiceHealthRow,
  'healthStatus' | 'version' | 'detail'
> {
  const healthStatus = typeof body?.status === 'string' ? body.status : null;
  const rawVersion = typeof body?.version === 'string' ? body.version.trim() : null;
  const version = rawVersion && rawVersion !== '0.0.0' ? rawVersion : null;
  const detail = typeof body?.detail === 'string' ? body.detail : null;
  return { healthStatus, version, detail };
}

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
  const checkedAt = new Date().toISOString();
  const baseUrl = def.resolveApiBase();

  if (!baseUrl) {
    return healthRow(def, checkedAt, {
      baseUrl: null,
      reachability: 'not_configured',
      errorMessage: 'VITE_* API URL not set for this service',
    });
  }

  const started = performance.now();

  try {
    const headers = new Headers({ Accept: 'application/json' });
    injectPlatformTraceHeaders(headers);
    const response = await fetch(healthCheckUrl(baseUrl), {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(HEALTH_PROBE_TIMEOUT_MS),
    });
    const latencyMs = Math.round(performance.now() - started);

    let body: HealthJson | null = null;
    try {
      body = (await response.json()) as HealthJson;
    } catch {
      body = null;
    }

    const parsed = parseHealthBody(body);
    const hasStatus = Boolean(body?.status);

    return healthRow(def, checkedAt, {
      baseUrl,
      reachability: hasStatus
        ? reachabilityFromStatus(response.ok, parsed.healthStatus)
        : 'unhealthy',
      ...parsed,
      latencyMs,
      errorMessage: hasStatus
        ? response.ok
          ? null
          : `HTTP ${response.status}`
        : response.ok
          ? 'Health response missing status field'
          : `HTTP ${response.status}`,
    });
  } catch (err) {
    return healthRow(def, checkedAt, {
      baseUrl,
      reachability: 'unreachable',
      latencyMs: Math.round(performance.now() - started),
      errorMessage: toUserFacingError(err, 'Health check failed'),
    });
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
  const counts = rows.reduce<Partial<Record<ServiceReachability, number>>>(
    (acc, { reachability }) => {
      acc[reachability] = (acc[reachability] ?? 0) + 1;
      return acc;
    },
    {},
  );
  const n = (status: ServiceReachability) => counts[status] ?? 0;
  const notConfigured = n('not_configured');
  return {
    configured: rows.length - notConfigured,
    healthy: n('healthy'),
    degraded: n('degraded'),
    unhealthy: n('unhealthy'),
    unreachable: n('unreachable'),
    notConfigured,
  };
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
