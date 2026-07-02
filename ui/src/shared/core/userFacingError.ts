import { trace } from '@opentelemetry/api';

const ZERO_TRACE_ID = '00000000000000000000000000000000';

function formatHelpdeskCode(traceId: string): string {
  return traceId.slice(-8).toUpperCase();
}

/** Short support code derived from the active OpenTelemetry trace ID. */
export function helpdeskTraceCode(): string {
  const activeTraceId = trace.getActiveSpan()?.spanContext().traceId;
  if (activeTraceId && activeTraceId !== ZERO_TRACE_ID) {
    return formatHelpdeskCode(activeTraceId);
  }

  return trace.getTracer('cdp-ui').startActiveSpan('ui.support', (span) => {
    try {
      return formatHelpdeskCode(span.spanContext().traceId);
    } finally {
      span.end();
    }
  });
}

export function unknownUserErrorMessage(): string {
  return `We encountered an unknown error. If you contact our helpdesk, please reference code: ${helpdeskTraceCode()}.`;
}

function isSafeKnownErrorMessage(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed) {
    return false;
  }
  if (/^HTTP \d{3}$/.test(trimmed)) {
    return false;
  }
  if (trimmed === 'Request failed') {
    return false;
  }
  return true;
}

/**
 * Maps an caught error to user-visible copy. Known API messages pass through;
 * otherwise returns contextual or generic text with a helpdesk trace code.
 */
export function toUserFacingError(error: unknown, contextMessage?: string): string {
  if (error instanceof Error && isSafeKnownErrorMessage(error.message)) {
    return error.message;
  }
  if (contextMessage) {
    const trimmed = contextMessage.trim().replace(/\.$/, '');
    return `${trimmed}. If you contact our helpdesk, please reference code: ${helpdeskTraceCode()}.`;
  }
  return unknownUserErrorMessage();
}

/** Non-fatal display enrichment; callers keep a safe fallback instead of surfacing an error. */
export function swallowOptionalEnrichmentError(error: unknown): void {
  void error;
  // Intentionally not user-visible.
}
