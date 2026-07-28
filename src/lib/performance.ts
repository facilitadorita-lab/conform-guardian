import { captureOperationalError } from "./observability";

let initialized = false;

/** Telemetria leve, sem enviar conteúdo de documentos ou parâmetros sensíveis. */
export function initializePerformanceTelemetry() {
  if (typeof window === "undefined" || initialized || !("PerformanceObserver" in window)) {
    return () => {};
  }
  initialized = true;
  const observers: PerformanceObserver[] = [];

  const observe = (type: string, callback: (entry: PerformanceEntry) => void) => {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) callback(entry);
      });
      observer.observe({ type, buffered: true });
      observers.push(observer);
    } catch {
      // Alguns navegadores não suportam todos os tipos de entrada.
    }
  };

  observe("largest-contentful-paint", (entry) => {
    if (entry.startTime > 4_000) {
      void captureOperationalError(
        new Error(`LCP acima do esperado: ${Math.round(entry.startTime)}ms`),
        "performance.lcp",
      );
    }
  });
  observe("longtask", (entry) => {
    if (entry.duration > 250) {
      void captureOperationalError(
        new Error(`Tarefa longa no frontend: ${Math.round(entry.duration)}ms`),
        "performance.longtask",
      );
    }
  });

  return () => {
    observers.forEach((observer) => observer.disconnect());
    initialized = false;
  };
}
