import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const uiRootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
// VITE_* for prod-parity local builds (same defaults as ui/Dockerfile).
dotenv.config({ path: path.join(uiRootDir, '.env') });
dotenv.config({ path: path.join(uiRootDir, 'e2e', '.env') });

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy e2e/env.sample to e2e/.env or export credentials before running Playwright.`,
    );
  }
  return value;
}

export function isLocalAppUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

export function e2eLocalPort(): string {
  // Must match authentication / WorkOS redirect URI for local dev (see ui/.env.sample).
  return process.env.E2E_APP_PORT ?? '5173';
}

/** Remote staging/prod URL, or undefined when Playwright should build and serve locally. */
export function e2eRemoteBaseUrl(): string | undefined {
  const configured = process.env.E2E_BASE_URL?.trim();
  if (!configured || isLocalAppUrl(configured)) {
    return undefined;
  }
  return configured;
}

export function e2eAppBaseUrl(): string {
  return e2eRemoteBaseUrl() ?? `http://localhost:${e2eLocalPort()}`;
}

/** Display code from `care-episode/src/data/demo_patients.json` (seed_demo_platform.py). */
export const e2eEnv = {
  baseUrl: e2eAppBaseUrl(),
  authBaseUrl: process.env.E2E_AUTH_BASE_URL ?? 'http://localhost:8014',
  email: () => requireEnv('E2E_AUTH_EMAIL'),
  password: () => requireEnv('E2E_AUTH_PASSWORD'),
  patientDisplayCode: process.env.E2E_PATIENT_DISPLAY_CODE ?? 'DEMO-123',
  workosOrg: process.env.E2E_WORKOS_ORG ?? 'Neosofia',
  clinicianRoleLabel: process.env.E2E_CLINICIAN_ROLE ?? 'Site Clinical',
  patientRoleLabel: process.env.E2E_PATIENT_ROLE ?? 'Patient',
};
