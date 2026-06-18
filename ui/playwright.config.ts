import { defineConfig, devices } from '@playwright/test';

import { e2eAppBaseUrl, e2eLocalPort, e2eRemoteBaseUrl } from './e2e/helpers/env';
import {
  WALKTHROUGH_DEVICE_SCALE_FACTOR,
  WALKTHROUGH_MOBILE_USE,
  WALKTHROUGH_VIEWPORTS,
} from './e2e/helpers/walkthrough';

const baseURL = e2eAppBaseUrl();
const serveLocalProdBuild = !e2eRemoteBaseUrl();
const localServePort = e2eLocalPort();
const isGithubActions = process.env.GITHUB_ACTIONS === 'true';

const desktopViewport = WALKTHROUGH_VIEWPORTS.desktop;

export default defineConfig({
  testDir: './e2e',
  // Keep walkthrough PNGs in test-results/walkthrough/ across project runs.
  outputDir: 'test-results/playwright',
  fullyParallel: false,
  forbidOnly: isGithubActions,
  retries: isGithubActions ? 1 : 0,
  workers: 1,
  reporter: isGithubActions ? 'github' : 'list',
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
        // Set E2E_SKIP_BUILD=1 when dist/ is already fresh (local debug).
        command: process.env.E2E_SKIP_BUILD
          ? `pnpm exec serve -s dist -l ${localServePort}`
          : `pnpm run build && pnpm exec serve -s dist -l ${localServePort}`,
        url: baseURL,
        reuseExistingServer: !isGithubActions,
        timeout: 180_000,
      }
    : undefined,
  projects: [
    {
      name: 'desktop-chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: desktopViewport,
        deviceScaleFactor: WALKTHROUGH_DEVICE_SCALE_FACTOR.desktop,
      },
    },
    {
      name: 'mobile-chromium',
      use: {
        ...WALKTHROUGH_MOBILE_USE,
      },
    },
  ],
});
