import { WebTracerProvider, SimpleSpanProcessor, ConsoleSpanExporter } from '@opentelemetry/sdk-trace-web';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { W3CTraceContextPropagator } from '@opentelemetry/core';

export const setupTracing = () => {
  const provider = new WebTracerProvider({
    spanProcessors: [
      new SimpleSpanProcessor(new ConsoleSpanExporter())
    ]
  });

  // Register the provider
  provider.register({
    propagator: new W3CTraceContextPropagator(), // Ensures traceparent is sent via W3C format
  });

  // Register auto-instrumentations (for fetch, XMLHTTPRequest, document load, etc.)
  registerInstrumentations({
    instrumentations: [
      getWebAutoInstrumentations({
        // Configure fetch instrumentation to propagate headers correctly 
        // to our local test environment URLs
        '@opentelemetry/instrumentation-fetch': {
          propagateTraceHeaderCorsUrls: [
            /http:\/\/localhost:8014/,
            /http:\/\/localhost:8018/,
            /http:\/\/localhost:8019/,
            /http:\/\/localhost:8900/,
            /.*localhost.*/,
          ],
        },
      }),
    ],
  });
  
  return provider;
};
