/** Product spec cross-references for Playwright E2E traceability (see ADR-0020). */

export interface ProductSpecRef {
  /** Numbered spec id (matches `cdp/specs/NNN-*.md`). */
  spec: string;
  /** Optional FR/OR anchors within that spec. */
  anchors?: string[];
}

export interface E2eSpecTrace {
  file: string;
  summary: string;
  specs: ProductSpecRef[];
}

/** Playwright spec file → product specs it directly verifies. */
export const E2E_SPEC_TRACE: Record<string, E2eSpecTrace> = {
  'visual-walkthrough.spec.ts': {
    file: 'visual-walkthrough.spec.ts',
    summary: 'Responsive UI walkthrough (screenshot gallery)',
    specs: [
      { spec: '019', anchors: ['OR-003', 'FR-003', 'FR-004', 'FR-008'] },
      { spec: '015', anchors: ['FR-001', 'FR-005', 'FR-006'] },
      { spec: '001' },
      { spec: '018', anchors: ['FR-006'] },
      { spec: '010' },
    ],
  },
  'enroll-workflow.spec.ts': {
    file: 'enroll-workflow.spec.ts',
    summary: 'Clinician enrolls a new patient in post-care monitoring',
    specs: [
      { spec: '015', anchors: ['FR-001'] },
      { spec: '018', anchors: ['FR-006'] },
    ],
  },
  'care-episode-lifecycle.spec.ts': {
    file: 'care-episode-lifecycle.spec.ts',
    summary: 'Clinician closes then reopens an active care episode',
    specs: [
      { spec: '015', anchors: ['FR-001', 'FR-008'] },
      { spec: '019', anchors: ['FR-004'] },
    ],
  },
};

const SPEC_FILES: Record<string, string> = {
  '000': '000-platform-baseline.md',
  '001': '001-chat-service.md',
  '010': '010-ai-agent-service.md',
  '015': '015-care-episode-service.md',
  '018': '018-user-service.md',
  '019': '019-cdp-web-application.md',
};

export function formatProductSpecRef(ref: ProductSpecRef): string {
  const anchorSuffix = ref.anchors?.length ? ` ${ref.anchors.join(', ')}` : '';
  return `${ref.spec}${anchorSuffix}`;
}

export function formatProductSpecs(refs: ProductSpecRef[]): string {
  return refs.map(formatProductSpecRef).join(' · ');
}

export function specMarkdownPath(ref: ProductSpecRef): string {
  const filename = SPEC_FILES[ref.spec] ?? `${ref.spec}.md`;
  return `specs/${filename}`;
}

/** Gallery caption trace line — product specs only (not Playwright file names). */
export function formatWalkthroughTraceLine(specs: ProductSpecRef[]): string {
  return formatProductSpecs(specs);
}

/** Full gallery caption: title + product spec traceability. */
export function formatWalkthroughCaption(step: {
  id: string;
  title: string;
  specs: ProductSpecRef[];
}): { title: string; trace: string } {
  return {
    title: `${step.id} — ${step.title}`,
    trace: formatWalkthroughTraceLine(step.specs),
  };
}
