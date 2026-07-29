import type { BannerHandle } from './banner-renderer';
import { renderBanner } from './banner-renderer';
import { buildConsentChecksum } from './checksum';
import { clearConsent, loadConsent, saveConsent } from './consent-store';
import { isGlobalPrivacyControlEnabled } from './gpc';
import { mountPrivacyTrigger, type PrivacyTriggerHandle } from './privacy-trigger';
import { detectVisitorRegion } from './region';
import { buildConsentState, shouldShowBanner, type CategorySnapshot, type CmpConfig } from './types';
import { getOrCreateVisitorId, type VisitorIdentity } from './visitor-id';

export type ConsentCollectionMethod =
  | 'banner_accept_all'
  | 'banner_reject_all'
  | 'banner_custom'
  | 'api'
  | 'withdrawal'
  | 'gpc';

type ConsentListener = (consent: Record<string, boolean>) => void;
type ReadyListener = (config: CmpConfig) => void;

export class CmpSdk {
  private config: CmpConfig | null = null;
  private bannerHandle: BannerHandle | null = null;
  private privacyTrigger: PrivacyTriggerHandle | null = null;
  private visitor: VisitorIdentity | null = null;
  private consent: Record<string, boolean> = { strictly_necessary: true };
  private ready = false;
  private readonly readyListeners = new Set<ReadyListener>();
  private readonly changeListeners = new Set<ConsentListener>();

  constructor(
    private readonly domainKey: string,
    private readonly apiBase: string,
    private readonly debug = false,
  ) {}

  async init() {
    const result = await this.fetchConfig();
    if (!result.ok || !result.data) {
      if (this.debug) console.warn('[CMP] Config unavailable', result);
      return;
    }

    this.applyConfig(result.data as CmpConfig);
  }

  private async fetchConfig() {
    const response = await fetch(`${this.apiBase}/config/${encodeURIComponent(this.domainKey)}`);
    return response.json() as Promise<{ ok?: boolean; data?: CmpConfig; error?: { code?: string } }>;
  }

  private applyConfig(config: CmpConfig) {
    this.config = config;
    this.visitor = getOrCreateVisitorId(this.domainKey);
    this.ready = true;
    this.restoreStoredConsent();
    this.emitReady();
    this.maybeApplyGpc();
    this.maybeShowBanner();
    this.mountPrivacyTrigger();
    document.dispatchEvent(new CustomEvent('cmp:ready', { detail: this.config }));
  }

  getConsent() {
    return { ...this.consent };
  }

  hasConsent(category: string) {
    return Boolean(this.consent[category]);
  }

  getPolicyVersion() {
    return {
      policyVersionId: this.config?.policyVersionId ?? null,
      policyVersionNumber: this.config?.policyVersionNumber ?? null,
      configVersion: this.config?.configVersion ?? null,
    };
  }

  getVisitorId() {
    return this.visitor?.visitorId ?? null;
  }

  onConsentReady(listener: ReadyListener) {
    if (this.ready && this.config) listener(this.config);
    this.readyListeners.add(listener);
    return () => this.readyListeners.delete(listener);
  }

  onConsentChanged(listener: ConsentListener) {
    listener({ ...this.consent });
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }

  acceptAll() {
    return this.applyConsent(buildConsentState(this.categories(), 'accept_all'), 'banner_accept_all');
  }

  rejectAll() {
    return this.applyConsent(buildConsentState(this.categories(), 'reject_all'), 'banner_reject_all');
  }

  setConsent(categories: Record<string, boolean>) {
    const validated = this.validateCategories(categories);
    return this.applyConsent(validated, 'api');
  }

  withdrawConsent() {
    const withdrawn = buildConsentState(this.categories(), 'reject_all');
    return this.applyConsent(withdrawn, 'withdrawal');
  }

  openPreferences() {
    if (!this.config?.banner) return;
    this.bannerHandle?.destroy();
    this.bannerHandle = renderBanner(this.config, (consent) =>
      this.applyConsent(consent, 'banner_custom'),
    );
    this.bannerHandle.openPreferences();
  }

  showBanner() {
    if (!this.config?.banner) return;
    this.bannerHandle?.destroy();
    this.bannerHandle = renderBanner(this.config, (consent) =>
      this.applyConsent(consent, 'banner_custom'),
    );
    this.bannerHandle.show();
  }

  hideBanner() {
    this.bannerHandle?.hide();
  }

  private categories(): CategorySnapshot[] {
    return (this.config?.categories ?? []).filter((category) => category.enabled !== false);
  }

  private validateCategories(categories: Record<string, boolean>) {
    const allowed = new Set(this.categories().map((category) => category.slug));
    const validated: Record<string, boolean> = {};
    for (const [slug, enabled] of Object.entries(categories)) {
      if (!allowed.has(slug)) continue;
      validated[slug] = enabled;
    }
    for (const category of this.categories()) {
      if (category.required || category.slug === 'strictly_necessary') {
        validated[category.slug] = true;
      } else if (!(category.slug in validated)) {
        validated[category.slug] = category.defaultState === 'ENABLED';
      }
    }
    return validated;
  }

  private restoreStoredConsent() {
    if (!this.config) return;
    const stored = loadConsent(this.domainKey, this.config.configVersion);
    if (!stored) return;
    this.consent = stored.categories;
    this.emitConsentChanged();
  }

  private maybeApplyGpc() {
    if (!this.config) return;
    const behavior = this.config.banner?.behavior ?? {};
    if (!behavior.respectGlobalPrivacyControl || !isGlobalPrivacyControlEnabled()) return;
    if (loadConsent(this.domainKey, this.config.configVersion)) return;
    void this.applyConsent(buildConsentState(this.categories(), 'reject_all'), 'gpc');
  }

  private maybeShowBanner() {
    if (!this.config?.banner) return;
    const stored = loadConsent(this.domainKey, this.config.configVersion);
    const show = shouldShowBanner({
      pathname: location.pathname,
      behavior: this.config.banner.behavior,
      hasStoredConsent: Boolean(stored),
      requiresRenewal: this.config.requiresRenewal,
      gpcEnabled: isGlobalPrivacyControlEnabled(),
    });
    if (!show) return;

    const launch = () => this.showBanner();
    const behavior = this.config.banner.behavior ?? {};
    const delay = behavior.displayDelayMs ?? 0;
    const scrollPercent = behavior.displayAfterScrollPercent ?? 0;

    const schedule = () => {
      if (scrollPercent > 0) {
        const onScroll = () => {
          const scrolled =
            (window.scrollY / Math.max(document.body.scrollHeight - window.innerHeight, 1)) * 100;
          if (scrolled >= scrollPercent) {
            window.removeEventListener('scroll', onScroll);
            launch();
          }
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
        return;
      }
      if (delay > 0) window.setTimeout(launch, delay);
      else launch();
    };

    if (behavior.displayAfterInteraction) {
      const events: Array<keyof WindowEventMap> = ['click', 'keydown', 'scroll', 'touchstart'];
      const handler = () => {
        events.forEach((event) => window.removeEventListener(event, handler));
        schedule();
      };
      events.forEach((event) => window.addEventListener(event, handler, { once: true, passive: true }));
      return;
    }
    schedule();
  }

  private mountPrivacyTrigger() {
    this.privacyTrigger?.destroy();
    if (!this.config) return;
    const stored = loadConsent(this.domainKey, this.config.configVersion);
    if (!stored) return;
    const trigger = this.config.banner?.privacyTrigger;
    this.privacyTrigger = mountPrivacyTrigger(trigger, () => this.openPreferences());
  }

  private async applyConsent(categories: Record<string, boolean>, method: ConsentCollectionMethod) {
    if (!this.config) return;
    this.consent = categories;
    this.visitor = getOrCreateVisitorId(this.domainKey);
    const regionInfo = detectVisitorRegion(this.config.region);
    const savedAt = new Date().toISOString();
    const behavior = this.config.banner?.behavior;
    const days = behavior?.rememberChoice === false ? 0 : (behavior?.consentExpirationDays ?? 365);
    const expiresAt = days > 0 ? new Date(Date.now() + days * 86_400_000).toISOString() : null;
    const checksum = await buildConsentChecksum({
      visitorId: this.visitor.visitorId,
      configVersion: this.config.configVersion,
      categories,
      savedAt,
    });

    saveConsent(
      this.domainKey,
      {
        visitorId: this.visitor.visitorId,
        configVersion: this.config.configVersion,
        policyVersionId: this.config.policyVersionId ?? null,
        policyVersionNumber: this.config.policyVersionNumber ?? null,
        categories,
        region: regionInfo.region,
        language: regionInfo.language,
        expiresAt: expiresAt ? new Date(expiresAt).getTime() : null,
        checksum,
      },
      behavior,
    );

    void this.submitConsentToServer({
      categories,
      method,
      checksum,
      savedAt,
      expiresAt,
      region: regionInfo.region ?? undefined,
      language: regionInfo.language,
    });

    this.bannerHandle?.hide();
    this.mountPrivacyTrigger();
    this.emitConsentChanged();
    document.dispatchEvent(new CustomEvent('cmp:consent-update', { detail: categories }));
  }

  private async submitConsentToServer(input: {
    categories: Record<string, boolean>;
    method: ConsentCollectionMethod;
    checksum: string;
    savedAt: string;
    expiresAt: string | null;
    region?: string;
    language?: string;
  }) {
    if (!this.config || !this.visitor) return;
    try {
      await fetch(`${this.apiBase}/consent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domainKey: this.domainKey,
          visitorId: this.visitor.visitorId,
          policyVersionId: this.config.policyVersionId ?? null,
          configVersion: this.config.configVersion,
          categories: input.categories,
          region: input.region,
          language: input.language,
          collectionMethod: input.method,
          checksum: input.checksum,
          savedAt: input.savedAt,
          expiresAt: input.expiresAt,
        }),
      });
    } catch {
      if (this.debug) console.warn('[CMP] Failed to submit consent to server');
    }
  }

  private emitReady() {
    if (!this.config) return;
    this.readyListeners.forEach((listener) => listener(this.config!));
  }

  private emitConsentChanged() {
    const snapshot = { ...this.consent };
    this.changeListeners.forEach((listener) => listener(snapshot));
  }
}
