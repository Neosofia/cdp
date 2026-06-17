function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy e2e/env.sample to e2e/.env or export credentials before running Playwright.`,
    );
  }
  return value;
}

/** Display code from `care-episode/src/data/demo_patients.json` (seed_demo_platform.py). */
export const e2eEnv = {
  baseUrl: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
  authBaseUrl: process.env.E2E_AUTH_BASE_URL ?? 'http://localhost:8014',
  email: () => requireEnv('E2E_AUTH_EMAIL'),
  password: () => requireEnv('E2E_AUTH_PASSWORD'),
  patientDisplayCode: process.env.E2E_PATIENT_DISPLAY_CODE ?? 'DEMO-123',
  workosOrg: process.env.E2E_WORKOS_ORG ?? 'Neosofia',
  clinicianRoleLabel: process.env.E2E_CLINICIAN_ROLE ?? 'Site Clinical',
};
