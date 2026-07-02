import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, devices, type Locator, type Page, type TestInfo } from '@playwright/test';

import { waitForAppSheetClosed, waitForAppSheetReady } from './nav';
import {
  formatWalkthroughCaption,
  type ProductSpecRef,
} from './specTraceability';

const uiRootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
/** Outside Playwright outputDir so mobile/desktop runs do not wipe each other. */
const resultsDir = path.join(uiRootDir, 'test-results', 'walkthrough');

export type WalkthroughMode = 'mobile' | 'desktop';

export const WALKTHROUGH_PROJECT_BY_MODE: Record<WalkthroughMode, string> = {
  mobile: 'mobile-chromium',
  desktop: 'desktop-chromium',
};

export const WALKTHROUGH_MODE_BY_PROJECT: Record<string, WalkthroughMode> = {
  'mobile-chromium': 'mobile',
  'desktop-chromium': 'desktop',
};

export interface WalkthroughStep {
  id: string;
  slug: string;
  title: string;
  /** Product specs this capture supports (`cdp/specs/`). */
  specs: ProductSpecRef[];
  /** Optional extra mobile-only capture (stacked under the primary mobile shot). */
  mobileExtra?: { suffix: string; label: string };
}

export const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    id: '01',
    slug: 'clinician-dashboard',
    title: 'Clinician dashboard',
    specs: [{ spec: '019', anchors: ['FR-004'] }],
  },
  {
    id: '02',
    slug: 'patient-list',
    title: 'Patient list',
    specs: [{ spec: '019', anchors: ['FR-004'] }, { spec: '015', anchors: ['FR-005'] }],
    mobileExtra: { suffix: 'filters', label: 'Patient filters sheet' },
  },
  {
    id: '03',
    slug: 'enroll-sheet',
    title: 'Enroll sheet',
    specs: [{ spec: '015', anchors: ['FR-001'] }],
  },
  {
    id: '04',
    slug: 'enroll-new-patient',
    title: 'Enroll new patient',
    specs: [{ spec: '015', anchors: ['FR-001'] }, { spec: '018', anchors: ['FR-006'] }],
  },
  {
    id: '05',
    slug: 'filters-sheet',
    title: 'Filters sheet',
    specs: [{ spec: '019', anchors: ['FR-004'] }],
  },
  {
    id: '06',
    slug: 'patient-search',
    title: 'Patient search',
    specs: [{ spec: '019', anchors: ['FR-004'] }, { spec: '015', anchors: ['FR-005'] }],
  },
  {
    id: '07',
    slug: 'edit-sheet',
    title: 'Edit patient sheet',
    specs: [{ spec: '018', anchors: ['FR-006'] }, { spec: '019', anchors: ['FR-004'] }],
  },
  {
    id: '08',
    slug: 'risk-summary',
    title: 'AI interaction summary',
    specs: [{ spec: '015', anchors: ['FR-006'] }, { spec: '010' }],
  },
  {
    id: '09',
    slug: 'clinician-chat',
    title: 'Clinician chat (Alice Hartley)',
    specs: [{ spec: '001' }, { spec: '019', anchors: ['FR-004'] }],
  },
  {
    id: '10',
    slug: 'patient-dashboard',
    title: 'Patient dashboard',
    specs: [{ spec: '019', anchors: ['FR-003'] }],
  },
  {
    id: '11',
    slug: 'patient-chat',
    title: 'Patient chat (Care team)',
    specs: [{ spec: '019', anchors: ['FR-003'] }, { spec: '001' }],
    mobileExtra: { suffix: 'conversations', label: 'Prior conversations sheet' },
  },
];

export function walkthroughScreenshotFile(
  mode: WalkthroughMode,
  step: WalkthroughStep,
  extraSuffix?: string,
): string {
  if (extraSuffix) {
    return `walkthrough-${mode}-${step.id}-${step.slug}-${extraSuffix}.png`;
  }
  return `walkthrough-${mode}-${step.id}-${step.slug}.png`;
}

export function walkthroughScreenshotPath(
  mode: WalkthroughMode,
  step: WalkthroughStep,
  extraSuffix?: string,
): string {
  return path.join(resultsDir, walkthroughScreenshotFile(mode, step, extraSuffix));
}

export function walkthroughModeFromTestInfo(testInfo: TestInfo): WalkthroughMode | null {
  return WALKTHROUGH_MODE_BY_PROJECT[testInfo.project.name] ?? null;
}

/** Optional filter: E2E_WALKTHROUGH_MODE=mobile|desktop */
export function walkthroughModeFilter(): WalkthroughMode | null {
  const value = process.env.E2E_WALKTHROUGH_MODE?.trim().toLowerCase();
  if (value === 'mobile' || value === 'desktop') {
    return value;
  }
  return null;
}

export function shouldRunWalkthroughMode(mode: WalkthroughMode): boolean {
  const filter = walkthroughModeFilter();
  return filter === null || filter === mode;
}

/** US common mobile low bar — Playwright iPhone 12 (390×664 CSS @ 3×). */
export const WALKTHROUGH_MOBILE_DEVICE = 'iPhone 12' as const;

const walkthroughMobilePreset = devices[WALKTHROUGH_MOBILE_DEVICE];
/** iPhone 12 profile for Chromium (viewport, DPR, touch, UA — not WebKit). */
export const WALKTHROUGH_MOBILE_USE = ((preset) => {
  const { defaultBrowserType, ...use } = preset;
  void defaultBrowserType;
  return use;
})(walkthroughMobilePreset);

export const WALKTHROUGH_VIEWPORTS = {
  mobile: walkthroughMobilePreset.viewport,
  /** Hospital / legacy laptop low bar (1366×768 is still common on clinical workstations). */
  desktop: { width: 1366, height: 768 },
} as const;

/** DPR for walkthrough captures (scale: 'device'). Gallery displays at logical WALKTHROUGH_VIEWPORTS. */
export const WALKTHROUGH_DEVICE_SCALE_FACTOR = {
  /** Retina desktop — matches sharp Chrome on macOS at the same layout width. */
  desktop: 2,
  mobile: walkthroughMobilePreset.deviceScaleFactor,
} as const;

/**
 * Gallery-only: mobile shown narrower than 1:1 CSS pixels so it reads hand-scale beside a laptop.
 * Captures stay at full iPhone 12 layout (390px); ~22% of desktop width ≈ phone vs laptop on a desk.
 */
export const WALKTHROUGH_MOBILE_GALLERY_WIDTH_RATIO = 0.22;

export function walkthroughGalleryDisplaySize(mode: WalkthroughMode): { width: number; height: number } {
  const viewport = WALKTHROUGH_VIEWPORTS[mode];
  if (mode === 'desktop') {
    return { width: viewport.width, height: viewport.height };
  }
  const displayWidth = Math.round(WALKTHROUGH_VIEWPORTS.desktop.width * WALKTHROUGH_MOBILE_GALLERY_WIDTH_RATIO);
  const scale = displayWidth / viewport.width;
  return {
    width: displayWidth,
    height: Math.round(viewport.height * scale),
  };
}

export async function captureWalkthroughStep(
  page: Page,
  mode: WalkthroughMode,
  step: WalkthroughStep,
  extraSuffix?: string,
): Promise<void> {
  await page.screenshot({
    path: walkthroughScreenshotPath(mode, step, extraSuffix),
    fullPage: false,
    type: 'png',
    // Device pixels at project deviceScaleFactor; gallery shows logical viewport size (sharp on Retina).
    scale: 'device',
    animations: 'disabled',
  });
}

export async function clickEnrollPatient(page: Page): Promise<void> {
  const mobileEnroll = page.getByRole('button', { name: 'Enroll patient' });
  if (await mobileEnroll.isVisible().catch(() => false)) {
    await mobileEnroll.click();
    return;
  }
  await page.getByRole('button', { name: 'Enroll', exact: true }).click();
}

export async function openFiltersForWalkthrough(page: Page, mode: WalkthroughMode): Promise<void> {
  if (mode === 'mobile') {
    await page.getByRole('button', { name: /^Filters/i }).click();
    await page.getByRole('heading', { name: 'Patient filters' }).waitFor();
    await waitForAppSheetReady(page);
    return;
  }
  await expect(page.getByRole('button', { name: /Episode:/i })).toBeVisible();
}

export async function closeFiltersAfterWalkthrough(page: Page, mode: WalkthroughMode): Promise<void> {
  if (mode === 'mobile') {
    await page.getByRole('button', { name: 'Apply filters' }).click();
    await page.getByRole('heading', { name: 'Patient filters' }).waitFor({ state: 'hidden' });
    await waitForAppSheetClosed(page);
  }
}

export function patientRow(page: Page, displayCode: string): Locator {
  return page.locator('li').filter({ hasText: displayCode });
}

export async function selectPatientFromRow(row: Locator): Promise<void> {
  await row.getByRole('button').first().click();
}

export function generateWalkthroughGallery(): string {
  const generatedAt = new Date().toISOString().slice(0, 10);

  const buildHtml = (imagePathPrefix: string) => {
    const figures = WALKTHROUGH_STEPS.map(step => {
      const renderShot = (mode: WalkthroughMode, file: string, exists: boolean, extraLabel?: string) => {
        const label = mode === 'mobile' ? 'Mobile' : 'Desktop';
        if (!exists) {
          return `<p class="missing">Missing — run <code>pnpm walkthrough:visual</code> (both projects; single-project runs no longer wipe the other mode).</p>`;
        }
        const display = walkthroughGalleryDisplaySize(mode);
        const cap = extraLabel
          ? `<p class="shot-caption">${extraLabel}</p>`
          : '';
        const src = `${imagePathPrefix}${file}`;
        const stepCaption = formatWalkthroughCaption(step);
        return `${cap}<div class="shot shot-${mode}"><img src="${src}" alt="${label} — ${stepCaption.title} — ${stepCaption.trace}" width="${display.width}" height="${display.height}" decoding="sync" /></div>`;
      };

      const renderPanel = (mode: WalkthroughMode) => {
        const label = mode === 'mobile' ? 'Mobile' : 'Desktop';
        const primaryFile = walkthroughScreenshotFile(mode, step);
        const primaryPath = path.join(resultsDir, primaryFile);
        const primaryExists = fs.existsSync(primaryPath);

        let body = renderShot(mode, primaryFile, primaryExists);
        if (mode === 'mobile' && step.mobileExtra) {
          const extraFile = walkthroughScreenshotFile('mobile', step, step.mobileExtra.suffix);
          const extraPath = path.join(resultsDir, extraFile);
          body += renderShot('mobile', extraFile, fs.existsSync(extraPath), step.mobileExtra.label);
        }

        return `
        <div class="panel panel-${mode}">
          <p class="panel-label">${label}</p>
          <div class="panel-shots">${body}</div>
        </div>`;
      };

      const caption = formatWalkthroughCaption(step);

      return `
    <figure>
      <figcaption>
        <div class="step-title">${caption.title}</div>
        <div class="step-trace">${caption.trace}</div>
      </figcaption>
      <div class="comparison">
        ${renderPanel('mobile')}
        ${renderPanel('desktop')}
      </div>
    </figure>`;
    }).join('');

    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Visual walkthrough — PD Care UI</title>
    <style>
      :root {
        color-scheme: light dark;
        font-family: Inter, system-ui, sans-serif;
        line-height: 1.5;
      }
      body {
        margin: 0;
        padding: 1.5rem 2rem 3rem;
        background: #f8fafc;
        color: #0f172a;
        display: flex;
        justify-content: center;
        overflow-x: auto;
      }
      .walkthrough {
        width: fit-content;
        max-width: 100%;
      }
      .walkthrough-header {
        text-align: center;
        margin-bottom: 2rem;
      }
      h1 {
        font-size: 1.25rem;
        margin: 0 0 0.25rem;
      }
      .subtitle {
        margin: 0;
        font-size: 0.875rem;
        color: #64748b;
      }
      figure {
        display: block;
        margin: 0 auto 2.5rem;
        width: fit-content;
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 0.75rem;
        box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
      }
      figcaption {
        padding: 0.75rem 1rem;
        font-size: 0.875rem;
        text-align: center;
        border-bottom: 1px solid #f1f5f9;
      }
      .step-title {
        font-weight: 600;
        margin-bottom: 0.25rem;
      }
      .step-trace {
        font-size: 0.75rem;
        font-weight: 500;
        color: #64748b;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      }
      .comparison {
        display: flex;
        flex-wrap: nowrap;
        gap: 4rem;
        align-items: flex-start;
        justify-content: center;
        width: fit-content;
        padding: 1.5rem 2.5rem;
      }
      .panel {
        padding: 0;
        flex: 0 0 auto;
      }
      .panel-shots {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }
      .shot-caption {
        margin: 0 0 0.35rem;
        font-size: 0.625rem;
        font-weight: 600;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: #94a3b8;
      }
      .shot {
        border: 3px solid #0f172a;
        border-radius: 0.375rem;
        background: #fff;
        box-shadow: inset 0 0 0 1px #cbd5e1;
        line-height: 0;
        width: fit-content;
      }
      .panel-label {
        margin: 0 0 0.5rem;
        font-size: 0.6875rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #64748b;
      }
      .shot img {
        display: block;
        max-width: none;
      }
      .missing {
        margin: 0;
        padding: 2rem 1rem;
        font-size: 0.8125rem;
        text-align: center;
        color: #64748b;
        border: 1px dashed #cbd5e1;
        border-radius: 0.375rem;
        background: #f8fafc;
      }
      code {
        font-size: 0.75rem;
      }
    </style>
  </head>
  <body>
    <div class="walkthrough">
      <header class="walkthrough-header">
        <h1>Visual walkthrough</h1>
        <p class="subtitle">Mobile ${WALKTHROUGH_MOBILE_DEVICE} captured at ${WALKTHROUGH_VIEWPORTS.mobile.width}×${WALKTHROUGH_VIEWPORTS.mobile.height} (shown ~${Math.round(WALKTHROUGH_MOBILE_GALLERY_WIDTH_RATIO * 100)}% of desktop width in gallery) · desktop ${WALKTHROUGH_VIEWPORTS.desktop.width}×${WALKTHROUGH_VIEWPORTS.desktop.height} · ${WALKTHROUGH_DEVICE_SCALE_FACTOR.mobile}× / ${WALKTHROUGH_DEVICE_SCALE_FACTOR.desktop}× device pixels · ${generatedAt} · captions reference product specs (ADR-0020)</p>
      </header>
      ${figures}
    </div>
  </body>
</html>
`;
  };

  fs.mkdirSync(resultsDir, { recursive: true });
  fs.mkdirSync(path.join(uiRootDir, 'test-results'), { recursive: true });

  const coLocatedPath = path.join(resultsDir, 'walkthrough.html');
  fs.writeFileSync(coLocatedPath, buildHtml(''), 'utf8');

  const galleryPath = path.join(uiRootDir, 'test-results', 'walkthrough.html');
  fs.writeFileSync(galleryPath, buildHtml('walkthrough/'), 'utf8');
  return galleryPath;
}
