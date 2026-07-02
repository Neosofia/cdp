import { WebTracerProvider, SimpleSpanProcessor, ConsoleSpanExporter } from '@opentelemetry/sdk-trace-web';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { W3CTraceContextPropagator } from '@opentelemetry/core';

export const setupTracing = () => {
  const spanProcessors = import.meta.env.DEV
    ? [new SimpleSpanProcessor(new ConsoleSpanExporter())]
    : [];

  const provider = new WebTracerProvider({
    spanProcessors,
  });

  provider.register({
    propagator: new W3CTraceContextPropagator(),
  });

  // Spans only — traceparent is set on platform fetches in platformApiFetch.ts.
  registerInstrumentations({
    instrumentations: [getWebAutoInstrumentations()],
  });

  return provider;
};
