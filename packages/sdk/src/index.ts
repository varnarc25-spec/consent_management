import { CmpSdk } from './cmp-sdk';
import { clearConsent } from './consent-store';

declare global {
  interface Window {
    CMP?: CmpSdk;
    __CMP__?: {
      domainKey: string;
      env: string;
      ready: boolean;
      consent: Record<string, boolean>;
      showBanner?: () => void;
      hideBanner?: () => void;
      openPreferences?: () => void;
      getConsent?: () => Record<string, boolean>;
      acceptAll?: () => void;
      rejectAll?: () => void;
      withdrawConsent?: () => void;
      hasConsent?: (category: string) => boolean;
      getVisitorId?: () => string | null;
    };
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

function getApiBase(script: HTMLScriptElement | null) {
  const src = script?.getAttribute('src') ?? '';
  return src.replace(/\/sdk\.js(?:\?.*)?$/, '');
}

function sendHeartbeat(apiBase: string, payload: Record<string, unknown>) {
  fetch(`${apiBase}/heartbeat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => undefined);
}

export function initFromScript() {
  const script = document.currentScript as HTMLScriptElement | null;
  const domainKey = script?.getAttribute('data-domain-key');
  const env = script?.getAttribute('data-env') ?? 'production';
  const debug = script?.getAttribute('data-debug') === 'true';
  if (!domainKey) {
    console.error('[CMP] Missing data-domain-key');
    return;
  }

  const apiBase = getApiBase(script);
  const sdk = new CmpSdk(domainKey, apiBase, debug);
  window.CMP = sdk;

  window.__CMP__ = {
    domainKey,
    env,
    ready: false,
    consent: { strictly_necessary: true },
    getConsent: () => sdk.getConsent(),
    acceptAll: () => sdk.acceptAll(),
    rejectAll: () => sdk.rejectAll(),
    withdrawConsent: () => sdk.withdrawConsent(),
    hasConsent: (category) => sdk.hasConsent(category),
    getVisitorId: () => sdk.getVisitorId(),
    showBanner: () => sdk.showBanner(),
    hideBanner: () => sdk.hideBanner(),
    openPreferences: () => sdk.openPreferences(),
  };

  sdk.onConsentReady(() => {
    if (!window.__CMP__) return;
    window.__CMP__.ready = true;
    window.__CMP__.consent = sdk.getConsent();
  });

  sdk.onConsentChanged((consent) => {
    if (!window.__CMP__) return;
    window.__CMP__.consent = consent;
  });

  const jsErrors: string[] = [];
  window.addEventListener('error', (event) => {
    if (event.message) jsErrors.push(event.message);
  });

  sendHeartbeat(apiBase, {
    domainKey,
    hostname: location.hostname,
    scriptLoaded: true,
    consentEventDetected: false,
    autoBlockingEnabled: true,
    googleConsentModeDetected:
      typeof window.gtag === 'function' || typeof window.dataLayer !== 'undefined',
    duplicateScripts: document.querySelectorAll(`script[data-domain-key="${domainKey}"]`).length,
    jsErrors: jsErrors.slice(0, 5),
    scriptLoadedFirst: true,
    defaultConsentApplied: true,
  });

  void sdk.init();

  return {
    sdk,
    clearConsent: () => clearConsent(domainKey),
  };
}

if (typeof document !== 'undefined') {
  initFromScript();
}

export { CmpSdk } from './cmp-sdk';
export { buildConsentState, shouldShowBanner } from './types';
export { loadConsent, saveConsent, clearConsent } from './consent-store';
export { renderBanner } from './banner-renderer';
export { isGlobalPrivacyControlEnabled } from './gpc';
export { getOrCreateVisitorId, rotateVisitorId } from './visitor-id';
export { detectVisitorRegion } from './region';
