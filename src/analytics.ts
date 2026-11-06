// GA4 via gtag.js. No-op when VITE_GA_MEASUREMENT_ID is unset (local dev).
// Raw user queries are never sent — only coarse kinds — so no PII hits GA.

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: [string, ...unknown[]]) => void;
  }
}

let ready = false;

export function initAnalytics(): void {
  const id = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim();
  if (!id || ready || typeof document === "undefined") return;
  // ponytail: DNT-only gate, no consent banner; add one if EU traffic matters.
  if (navigator.doNotTrack === "1") return;
  ready = true;
  window.dataLayer = window.dataLayer ?? [];
  window.gtag =
    window.gtag ??
    ((...args: [string, ...unknown[]]) => {
      window.dataLayer?.push(args);
    });
  window.gtag("js", new Date());
  window.gtag("config", id);
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.append(script);
}

export function trackEvent(name: string, params?: Record<string, unknown>): void {
  if (!ready) return;
  try {
    window.gtag?.("event", name, params ?? {});
  } catch {
    // Analytics must never break the app.
  }
}
