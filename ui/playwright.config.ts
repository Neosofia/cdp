import { defineConfig, devices } from '@playwright/test';

import { e2eAppBaseUrl, e2eLocalPort, e2eRemoteBaseUrl } from './e2e/helpers/env';

const baseURL = e2eAppBaseUrl();
const serveLocalProdBuild = !e2eRemoteBaseUrl();
const localServePort = e2eLocalPort();

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 120_000,
  expect: {
    timeout: 30_000,
  },
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: serveLocalProdBuild
    ? {
        // Same path as ui/Dockerfile: tsc -b && vite build, then serve -s dist.
        command: `pnpm run build && pnpm exec serve -s dist -l ${localServePort}`,
        url: baseURL,
        reuseExistingServer: false,
        timeout: 180_000,
      }
    : undefined,
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
