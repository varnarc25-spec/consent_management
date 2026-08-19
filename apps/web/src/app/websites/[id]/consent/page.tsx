'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { BannerPreview } from '@/components/banner-preview';
import { BannerStudio, type BannerStudioPane } from '@/components/banner-studio';
import { ProtectedLayout } from '@/components/protected-layout';
import { WebsiteLayout } from '@/components/website-layout';
import { apiFetch } from '@/lib/api';
import { BANNER_TEXT_TEMPLATES } from '@cmp/utils/banner-templates';
import {
  CONSENT_TEMPLATES,
  DEFAULT_REGIONAL_RULES,
  getConsentTemplate,
  listRegulationProfiles,
  resolveConsentTemplateBannerText,
  type ConsentTemplateId,
  type GeoRegulationSettings,
  type RegionalRule,
} from '@cmp/utils';

interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  legalBasis: string | null;
  defaultState: string;
  required: boolean;
  enabled: boolean;
  isSystem: boolean;
  sortOrder: number;
  vendorPurposes?: string[] | null;
}

interface BannerState {
  title: string;
  description: string;
  contentFormat: 'plain' | 'basic_html';
  acceptButton: string;
  rejectButton: string;
  preferencesButton: string;
  saveButton: string;
  closeButton: string;
  legalNotice: string;
  footerContent: string;
  privacyPolicyUrl: string;
  cookiePolicyUrl: string;
  categoryDescriptions: Record<string, string>;
  vendorDescriptions: Record<string, string>;
  layout: string;
  behavior: {
    displayOnFirstVisit: boolean;
    displayAfterConsentExpires: boolean;
    displayWhenPolicyChanges: boolean;
    displayDelayMs: number;
    displayAfterScrollPercent: number;
    displayAfterInteraction: boolean;
    blockInteractionUntilChoice: boolean;
    respectGlobalPrivacyControl: boolean;
    rememberChoice: boolean;
    consentExpirationDays: number;
    allowClose: boolean;
    showOnPages: string;
    excludePages: string;
  };
  theme: {
    primaryColor: string;
    backgroundColor: string;
    textColor: string;
    buttonTextColor: string;
    buttonStyle: 'filled' | 'outline' | 'soft';
    borderRadius: string;
    fontFamily: string;
    fontSize: string;
    spacing: string;
    shadow: string;
    overlayOpacity: number;
    logoUrl: string;
    iconUrl: string;
    customCss: string;
  };
  privacyTrigger: {
    enabled: boolean;
    mode: 'floating_icon' | 'footer_link' | 'api_only';
    label: string;
    position: 'bottom-left' | 'bottom-right';
    footerSelector: string;
  };
}

interface GoogleConsentModeConfig {
  enabled: boolean;
  mode: 'basic' | 'advanced';
  adsDataRedaction: boolean;
  urlPassthrough: boolean;
  waitForUpdate: number;
}

interface Policy {
  id: string;
  versionNumber: number;
  status: string;
  bannerContent: Partial<BannerState> | null;
  regulationConfig?: {
    googleConsentMode?: Partial<GoogleConsentModeConfig>;
    geo?: Partial<GeoRegulationSettings>;
    consentTemplateId?: ConsentTemplateId | string | null;
  } | null;
  changeSummary: string | null;
  publishedAt: string | null;
  scheduledAt: string | null;
  requiresRenewal: boolean;
  supportedLanguages?: string[] | null;
  legalText?: { defaultLanguage?: string } | null;
}

interface Renewal {
  id: string;
  reason: string;
  scope: string;
  createdAt: string;
}

const REGULATION_PROFILE_OPTIONS = listRegulationProfiles();

function mergeGeoSettings(config?: Partial<GeoRegulationSettings> | null): GeoRegulationSettings {
  return {
    enabled: config?.enabled ?? true,
    defaultProfileId: config?.defaultProfileId ?? 'generic_opt_in',
    regionalRules: (config?.regionalRules as RegionalRule[] | undefined) ?? DEFAULT_REGIONAL_RULES,
  };
}

const defaultGoogleConsentMode = (): GoogleConsentModeConfig => ({
  enabled: true,
  mode: 'advanced',
  adsDataRedaction: false,
  urlPassthrough: false,
  waitForUpdate: 500,
});

function mergeGoogleConsentMode(
  config?: Partial<GoogleConsentModeConfig> | null,
): GoogleConsentModeConfig {
  const base = defaultGoogleConsentMode();
  if (!config) return base;
  return {
    ...base,
    ...config,
    waitForUpdate: config.waitForUpdate ?? base.waitForUpdate,
  };
}

const defaultBanner = (): BannerState => ({
  title: 'We value your privacy',
  description:
    'We use cookies to improve your experience, analyze site traffic, and personalize content. You can manage your preferences at any time.',
  contentFormat: 'plain',
  acceptButton: 'Accept all',
  rejectButton: 'Reject all',
  preferencesButton: 'Manage preferences',
  saveButton: 'Save preferences',
  closeButton: 'Close',
  legalNotice: '',
  footerContent: '',
  privacyPolicyUrl: '',
  cookiePolicyUrl: '',
  categoryDescriptions: {},
  vendorDescriptions: {},
  layout: 'bottom_bar',
  behavior: {
    displayOnFirstVisit: true,
    displayAfterConsentExpires: true,
    displayWhenPolicyChanges: true,
    displayDelayMs: 0,
    displayAfterScrollPercent: 0,
    displayAfterInteraction: false,
    blockInteractionUntilChoice: false,
    respectGlobalPrivacyControl: false,
    rememberChoice: true,
    consentExpirationDays: 365,
    allowClose: false,
    showOnPages: '',
    excludePages: '',
  },
  theme: {
    primaryColor: '#0192d0',
    backgroundColor: '#ffffff',
    textColor: '#111827',
    buttonTextColor: '#ffffff',
    buttonStyle: 'filled',
    borderRadius: '8px',
    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
    fontSize: '16px',
    spacing: '1rem',
    shadow: '0 10px 30px rgba(0,0,0,.15)',
    overlayOpacity: 0.45,
    logoUrl: '',
    iconUrl: '',
    customCss: '',
  },
  privacyTrigger: {
    enabled: true,
    mode: 'floating_icon',
    label: 'Privacy settings',
    position: 'bottom-right',
    footerSelector: '',
  },
});

function parsePageList(value: string[] | string | undefined): string {
  if (Array.isArray(value)) return value.join(', ');
  return value ?? '';
}

function mergeBanner(content?: Partial<BannerState> | null): BannerState {
  const base = defaultBanner();
  if (!content) return base;

  const behavior = content.behavior as
    | (BannerState['behavior'] & { showOnPages?: string[] | string; excludePages?: string[] | string })
    | undefined;

  return {
    ...base,
    ...content,
    categoryDescriptions: { ...base.categoryDescriptions, ...(content.categoryDescriptions ?? {}) },
    vendorDescriptions: { ...base.vendorDescriptions, ...(content.vendorDescriptions ?? {}) },
    behavior: {
      ...base.behavior,
      ...(content.behavior ?? {}),
      showOnPages: parsePageList(behavior?.showOnPages ?? base.behavior.showOnPages),
      excludePages: parsePageList(behavior?.excludePages ?? base.behavior.excludePages),
    },
    theme: { ...base.theme, ...(content.theme ?? {}) },
    privacyTrigger: { ...base.privacyTrigger, ...(content.privacyTrigger ?? {}) },
  };
}

function serializeBanner(banner: BannerState) {
  return {
    ...banner,
    behavior: {
      ...banner.behavior,
      showOnPages: banner.behavior.showOnPages
        ? banner.behavior.showOnPages.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      excludePages: banner.behavior.excludePages
        ? banner.behavior.excludePages.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
    },
  };
}

export default function DomainConsentPage() {
  const params = useParams();
  const domainId = params.id as string;
  const [pane, setPane] = useState<BannerStudioPane>('content');
  const [categories, setCategories] = useState<Category[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [draft, setDraft] = useState<Policy | null>(null);
  const [renewals, setRenewals] = useState<Renewal[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [banner, setBanner] = useState<BannerState>(defaultBanner());
  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [scheduleAt, setScheduleAt] = useState('');
  const [renewalReason, setRenewalReason] = useState('admin_requested');
  const [textTemplate, setTextTemplate] = useState('');
  const [consentTemplateId, setConsentTemplateId] = useState<ConsentTemplateId | ''>('');
  const [geoSettings, setGeoSettings] = useState<GeoRegulationSettings>(mergeGeoSettings());
  const [googleConsentMode, setGoogleConsentMode] = useState<GoogleConsentModeConfig>(defaultGoogleConsentMode());
  const [supportedLanguages, setSupportedLanguages] = useState<string[]>(['en']);
  const [defaultLanguage, setDefaultLanguage] = useState('en');
  const [hostname, setHostname] = useState('');

  function applyTextTemplate(templateId: string) {
    const template = BANNER_TEXT_TEMPLATES.find((item) => item.id === templateId);
    if (!template) return;
    setBanner((current) => ({
      ...current,
      title: template.title,
      description: template.description,
      acceptButton: template.acceptButton,
      rejectButton: template.rejectButton,
      preferencesButton: template.preferencesButton,
      saveButton: template.saveButton,
      legalNotice: template.legalNotice,
      footerContent: template.footerContent,
    }));
  }

  function applyConsentTemplate(templateId: ConsentTemplateId) {
    const template = getConsentTemplate(templateId);
    if (!template) return;
    setConsentTemplateId(templateId);
    setGeoSettings(template.geo);
    setGoogleConsentMode((current) => ({ ...current, enabled: true }));
    const bannerText = resolveConsentTemplateBannerText(template);
    if (bannerText) setTextTemplate(bannerText.id);
    setBanner((current) => ({
      ...current,
      ...(bannerText
        ? {
            title: bannerText.title,
            description: bannerText.description,
            acceptButton: bannerText.acceptButton,
            rejectButton: bannerText.rejectButton,
            preferencesButton: bannerText.preferencesButton,
            saveButton: bannerText.saveButton,
            legalNotice: bannerText.legalNotice,
            footerContent: bannerText.footerContent,
          }
        : {}),
      behavior: {
        ...current.behavior,
        respectGlobalPrivacyControl: template.respectGlobalPrivacyControl,
      },
    }));
  }

  const vendorKeys = Array.from(
    new Set(
      categories.flatMap((category) => category.vendorPurposes ?? []).filter(Boolean),
    ),
  );

  function loadCategories() {
    apiFetch<Category[]>(`/domains/${domainId}/consent/categories`).then((r) => {
      if (r.data) setCategories(r.data);
    });
  }

  function loadPolicies() {
    apiFetch<Policy[]>(`/domains/${domainId}/consent/policies`).then((r) => {
      if (r.data) setPolicies(r.data);
    });
    apiFetch<Policy>(`/domains/${domainId}/consent/policies/draft`).then((r) => {
      if (r.data) {
        setDraft(r.data);
        setBanner(mergeBanner(r.data.bannerContent as Partial<BannerState>));
        const regulation = r.data.regulationConfig;
        setGoogleConsentMode(mergeGoogleConsentMode(regulation?.googleConsentMode));
        setGeoSettings(mergeGeoSettings(regulation?.geo));
        const templateId = regulation?.consentTemplateId;
        if (templateId === 'gdpr' || templateId === 'us_state_laws' || templateId === 'gdpr_and_us') {
          setConsentTemplateId(templateId);
        }
        const langs = (r.data.supportedLanguages as string[] | null) ?? ['en'];
        setSupportedLanguages(langs);
        const legal = r.data.legalText;
        setDefaultLanguage(legal?.defaultLanguage ?? langs[0] ?? 'en');
      }
    });
  }

  function loadRenewals() {
    apiFetch<Renewal[]>(`/domains/${domainId}/consent/renewals`).then((r) => {
      if (r.data) setRenewals(r.data);
    });
  }

  useEffect(() => {
    apiFetch<{ hostname: string }>(`/domains/${domainId}`, { silent: true }).then((r) => {
      if (r.data?.hostname) setHostname(r.data.hostname);
    });
    loadCategories();
    loadPolicies();
    loadRenewals();
  }, [domainId]);

  async function addCategory(e: FormEvent) {
    e.preventDefault();
    setError('');
    const result = await apiFetch<Category>(`/domains/${domainId}/consent/categories`, {
      method: 'POST',
      body: JSON.stringify({ name: newCategoryName }),
    });
    if (result.ok) {
      setNewCategoryName('');
      loadCategories();
      setMessage('Category created');
    } else {
      setError(result.error?.message ?? 'Failed to create category');
    }
  }

  async function updateCategory(category: Category, patch: Partial<Category>) {
    const result = await apiFetch<Category>(`/domains/${domainId}/consent/categories/${category.id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    if (result.ok) {
      loadCategories();
      setMessage('Category updated');
    } else {
      setError(result.error?.message ?? 'Failed to update category');
    }
  }

  async function moveCategory(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= categories.length) return;
    const ordered = [...categories];
    const [item] = ordered.splice(index, 1);
    ordered.splice(nextIndex, 0, item!);
    const result = await apiFetch<Category[]>(`/domains/${domainId}/consent/categories/reorder`, {
      method: 'POST',
      body: JSON.stringify({ orderedIds: ordered.map((c) => c.id) }),
    });
    if (result.ok) setCategories(result.data ?? ordered);
  }

  async function saveBanner(e?: FormEvent) {
    e?.preventDefault();
    if (!draft) return;
    const result = await apiFetch<Policy>(`/domains/${domainId}/consent/policies/${draft.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ bannerContent: serializeBanner(banner) }),
    });
    if (result.ok) {
      setMessage('Banner draft saved');
      loadPolicies();
    } else {
      setError(result.error?.message ?? 'Failed to save banner');
    }
  }

  function buildRegulationConfigPatch() {
    return {
      regulationConfig: {
        googleConsentMode,
        geo: geoSettings,
        consentTemplateId: consentTemplateId || null,
      },
      supportedLanguages,
      legalText: { defaultLanguage },
    };
  }

  async function saveRegulationSettings() {
    if (!draft) return;
    setError('');
    const result = await apiFetch<Policy>(`/domains/${domainId}/consent/policies/${draft.id}`, {
      method: 'PATCH',
      body: JSON.stringify(buildRegulationConfigPatch()),
    });
    if (result.ok) {
      setMessage('Consent template / regional settings saved');
      loadPolicies();
    } else {
      setError(result.error?.message ?? 'Failed to save regional settings');
    }
  }

  async function saveConsentTemplateAndBanner() {
    if (!draft) return;
    setError('');
    const result = await apiFetch<Policy>(`/domains/${domainId}/consent/policies/${draft.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        bannerContent: serializeBanner(banner),
        ...buildRegulationConfigPatch(),
      }),
    });
    if (result.ok) {
      setMessage('Consent template applied and saved to draft');
      loadPolicies();
    } else {
      setError(result.error?.message ?? 'Failed to save consent template');
    }
  }

  async function publishDraft() {
    setPublishing(true);
    setError('');
    setMessage('');
    if (!draft) {
      setError('No draft policy found. Refresh the page and try again.');
      setPublishing(false);
      return;
    }
    const saveResult = await apiFetch<Policy>(`/domains/${domainId}/consent/policies/${draft.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        bannerContent: serializeBanner(banner),
        ...buildRegulationConfigPatch(),
      }),
    });
    if (!saveResult.ok) {
      setError(saveResult.error?.message ?? 'Failed to save banner before publish');
      setPublishing(false);
      return;
    }
    const result = await apiFetch<Policy>(`/domains/${domainId}/consent/policies/${draft.id}/publish`, {
      method: 'POST',
      body: JSON.stringify({ changeSummary: 'Published banner configuration' }),
    });
    setPublishing(false);
    if (result.ok) {
      setMessage(`Published successfully — policy v${result.data?.versionNumber} is now live on your website.`);
      loadPolicies();
    } else {
      setError(result.error?.message ?? 'Failed to publish policy');
    }
  }

  async function scheduleDraft() {
    if (!draft || !scheduleAt) return;
    await saveBanner();
    const result = await apiFetch<Policy>(`/domains/${domainId}/consent/policies/${draft.id}/schedule`, {
      method: 'POST',
      body: JSON.stringify({ scheduledAt: new Date(scheduleAt).toISOString() }),
    });
    if (result.ok) {
      setMessage('Policy scheduled');
      loadPolicies();
    } else {
      setError(result.error?.message ?? 'Failed to schedule policy');
    }
  }

  async function triggerRenewal() {
    const result = await apiFetch(`/domains/${domainId}/consent/renewals`, {
      method: 'POST',
      body: JSON.stringify({ reason: renewalReason, scope: 'all' }),
    });
    if (result.ok) {
      setMessage('Consent renewal triggered');
      loadRenewals();
      loadPolicies();
    } else {
      setError(result.error?.message ?? 'Failed to trigger renewal');
    }
  }

  const selectedTemplate = CONSENT_TEMPLATES.find((item) => item.id === consentTemplateId);

  function renderPanel() {
    if (pane === 'general') {
      return (
        <>
          <div className="field">
            <label htmlFor="consentTemplateStudio">Consent Template</label>
            <select
              id="consentTemplateStudio"
              value={consentTemplateId}
              onChange={(e) => {
                const value = e.target.value as ConsentTemplateId | '';
                if (!value) {
                  setConsentTemplateId('');
                  return;
                }
                applyConsentTemplate(value);
              }}
            >
              <option value="">Choose a template…</option>
              {CONSENT_TEMPLATES.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.label}
                </option>
              ))}
            </select>
          </div>
          <p className="cy-banner-hint">
            {selectedTemplate?.description ??
              'Pick GDPR, US State Laws, or both to set geo rules and suggested banner copy.'}
          </p>
          <h3>General</h3>
          <div className="field">
            <label htmlFor="textTemplateStudio">Text template</label>
            <select
              id="textTemplateStudio"
              value={textTemplate}
              onChange={(e) => {
                setTextTemplate(e.target.value);
                if (e.target.value) applyTextTemplate(e.target.value);
              }}
            >
              <option value="">Choose a template…</option>
              {BANNER_TEXT_TEMPLATES.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>
              <input
                type="checkbox"
                checked={banner.behavior.displayOnFirstVisit}
                onChange={(e) =>
                  setBanner({ ...banner, behavior: { ...banner.behavior, displayOnFirstVisit: e.target.checked } })
                }
              />{' '}
              Display on first visit
            </label>
          </div>
          <div className="field">
            <label>
              <input
                type="checkbox"
                checked={banner.behavior.displayWhenPolicyChanges}
                onChange={(e) =>
                  setBanner({
                    ...banner,
                    behavior: { ...banner.behavior, displayWhenPolicyChanges: e.target.checked },
                  })
                }
              />{' '}
              Display when policy changes
            </label>
          </div>
          <div className="field">
            <label>
              <input
                type="checkbox"
                checked={banner.behavior.respectGlobalPrivacyControl}
                onChange={(e) =>
                  setBanner({
                    ...banner,
                    behavior: { ...banner.behavior, respectGlobalPrivacyControl: e.target.checked },
                  })
                }
              />{' '}
              Respect Global Privacy Control (GPC)
            </label>
          </div>
          <div className="field">
            <label>
              <input
                type="checkbox"
                checked={banner.behavior.allowClose}
                onChange={(e) =>
                  setBanner({ ...banner, behavior: { ...banner.behavior, allowClose: e.target.checked } })
                }
              />{' '}
              Allow close without choosing
            </label>
          </div>
          <div className="field">
            <label>
              <input
                type="checkbox"
                checked={banner.behavior.blockInteractionUntilChoice}
                onChange={(e) =>
                  setBanner({
                    ...banner,
                    behavior: { ...banner.behavior, blockInteractionUntilChoice: e.target.checked },
                  })
                }
              />{' '}
              Block interaction until choice
            </label>
          </div>
          <div className="field">
            <label htmlFor="consentExpirationDaysStudio">Consent expiration (days)</label>
            <input
              id="consentExpirationDaysStudio"
              type="number"
              min={0}
              value={banner.behavior.consentExpirationDays}
              onChange={(e) =>
                setBanner({
                  ...banner,
                  behavior: { ...banner.behavior, consentExpirationDays: Number(e.target.value) },
                })
              }
            />
          </div>
          <h4>Privacy trigger</h4>
          <div className="field">
            <label>
              <input
                type="checkbox"
                checked={banner.privacyTrigger.enabled}
                onChange={(e) =>
                  setBanner({
                    ...banner,
                    privacyTrigger: { ...banner.privacyTrigger, enabled: e.target.checked },
                  })
                }
              />{' '}
              Show privacy trigger after consent
            </label>
          </div>
          <div className="field">
            <label htmlFor="privacyTriggerLabelStudio">Trigger label</label>
            <input
              id="privacyTriggerLabelStudio"
              value={banner.privacyTrigger.label}
              onChange={(e) =>
                setBanner({
                  ...banner,
                  privacyTrigger: { ...banner.privacyTrigger, label: e.target.value },
                })
              }
            />
          </div>
        </>
      );
    }

    if (pane === 'layout') {
      return (
        <>
          <div className="field">
            <label htmlFor="consentTemplateLayout">Consent Template</label>
            <select
              id="consentTemplateLayout"
              value={consentTemplateId}
              onChange={(e) => {
                const value = e.target.value as ConsentTemplateId | '';
                if (!value) {
                  setConsentTemplateId('');
                  return;
                }
                applyConsentTemplate(value);
              }}
            >
              <option value="">Choose a template…</option>
              {CONSENT_TEMPLATES.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.label}
                </option>
              ))}
            </select>
          </div>
          <p className="cy-banner-hint">
            {selectedTemplate?.description ?? 'Choose a consent template to align layout defaults with local laws.'}
          </p>
          <h3>Layout</h3>
          <div className="cy-banner-layout-grid">
            {(
              [
                ['bottom_bar', 'Bottom bar'],
                ['top_bar', 'Top bar'],
                ['center_modal', 'Center'],
                ['corner_popup', 'Corner'],
                ['side_panel', 'Side panel'],
                ['compact', 'Compact'],
                ['multi_step_modal', 'Multi-step'],
                ['fullscreen', 'Fullscreen'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`cy-banner-layout-card${banner.layout === value ? ' active' : ''}`}
                onClick={() => setBanner({ ...banner, layout: value })}
              >
                <span className={`cy-banner-layout-thumb cy-layout-${value}`} />
                {label}
              </button>
            ))}
          </div>
        </>
      );
    }

    if (pane === 'content') {
      return (
        <>
          <div className="field">
            <label htmlFor="consentTemplateContent">Consent Template</label>
            <select
              id="consentTemplateContent"
              value={consentTemplateId}
              onChange={(e) => {
                const value = e.target.value as ConsentTemplateId | '';
                if (!value) {
                  setConsentTemplateId('');
                  return;
                }
                applyConsentTemplate(value);
              }}
            >
              <option value="">Choose a template…</option>
              {CONSENT_TEMPLATES.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.label}
                </option>
              ))}
            </select>
          </div>
          <p className="cy-banner-hint">
            {selectedTemplate?.description ??
              'Edit the banner copy visitors see. Changes update the live preview instantly.'}
          </p>
          <h3>Content</h3>
          <div className="field">
            <label htmlFor="titleStudio">Title</label>
            <input
              id="titleStudio"
              value={banner.title}
              onChange={(e) => setBanner({ ...banner, title: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="descriptionStudio">Description ({banner.description.length}/2000)</label>
            <textarea
              id="descriptionStudio"
              rows={7}
              maxLength={2000}
              value={banner.description}
              onChange={(e) => setBanner({ ...banner, description: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="acceptButtonStudio">Accept button</label>
            <input
              id="acceptButtonStudio"
              value={banner.acceptButton}
              onChange={(e) => setBanner({ ...banner, acceptButton: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="rejectButtonStudio">Reject / Do Not Sell</label>
            <input
              id="rejectButtonStudio"
              value={banner.rejectButton}
              onChange={(e) => setBanner({ ...banner, rejectButton: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="preferencesButtonStudio">Customize button</label>
            <input
              id="preferencesButtonStudio"
              value={banner.preferencesButton}
              onChange={(e) => setBanner({ ...banner, preferencesButton: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="legalNoticeStudio">Legal notice</label>
            <textarea
              id="legalNoticeStudio"
              rows={2}
              value={banner.legalNotice}
              onChange={(e) => setBanner({ ...banner, legalNotice: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="privacyPolicyUrlStudio">Privacy policy URL</label>
            <input
              id="privacyPolicyUrlStudio"
              type="url"
              value={banner.privacyPolicyUrl}
              onChange={(e) => setBanner({ ...banner, privacyPolicyUrl: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="cookiePolicyUrlStudio">Cookie policy URL</label>
            <input
              id="cookiePolicyUrlStudio"
              type="url"
              value={banner.cookiePolicyUrl}
              onChange={(e) => setBanner({ ...banner, cookiePolicyUrl: e.target.value })}
            />
          </div>
        </>
      );
    }

    if (pane === 'colors') {
      return (
        <>
          <div className="field">
            <label htmlFor="consentTemplateColors">Consent Template</label>
            <select
              id="consentTemplateColors"
              value={consentTemplateId}
              onChange={(e) => {
                const value = e.target.value as ConsentTemplateId | '';
                if (!value) {
                  setConsentTemplateId('');
                  return;
                }
                applyConsentTemplate(value);
              }}
            >
              <option value="">Choose a template…</option>
              {CONSENT_TEMPLATES.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.label}
                </option>
              ))}
            </select>
          </div>
          <p className="cy-banner-hint">Adjust banner colors, buttons, and typography.</p>
          <h3>Colors</h3>
          <div className="cy-banner-color-row">
            <div className="field">
              <label htmlFor="primaryColorStudio">Primary</label>
              <input
                id="primaryColorStudio"
                type="color"
                value={banner.theme.primaryColor}
                onChange={(e) => setBanner({ ...banner, theme: { ...banner.theme, primaryColor: e.target.value } })}
              />
            </div>
            <div className="field">
              <label htmlFor="backgroundColorStudio">Background</label>
              <input
                id="backgroundColorStudio"
                type="color"
                value={banner.theme.backgroundColor}
                onChange={(e) =>
                  setBanner({ ...banner, theme: { ...banner.theme, backgroundColor: e.target.value } })
                }
              />
            </div>
            <div className="field">
              <label htmlFor="textColorStudio">Text</label>
              <input
                id="textColorStudio"
                type="color"
                value={banner.theme.textColor}
                onChange={(e) => setBanner({ ...banner, theme: { ...banner.theme, textColor: e.target.value } })}
              />
            </div>
            <div className="field">
              <label htmlFor="buttonTextColorStudio">Button text</label>
              <input
                id="buttonTextColorStudio"
                type="color"
                value={banner.theme.buttonTextColor}
                onChange={(e) =>
                  setBanner({ ...banner, theme: { ...banner.theme, buttonTextColor: e.target.value } })
                }
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="buttonStyleStudio">Button style</label>
            <select
              id="buttonStyleStudio"
              value={banner.theme.buttonStyle}
              onChange={(e) =>
                setBanner({
                  ...banner,
                  theme: { ...banner.theme, buttonStyle: e.target.value as BannerState['theme']['buttonStyle'] },
                })
              }
            >
              <option value="filled">Filled</option>
              <option value="outline">Outline</option>
              <option value="soft">Soft</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="borderRadiusStudio">Border radius</label>
            <input
              id="borderRadiusStudio"
              value={banner.theme.borderRadius}
              onChange={(e) => setBanner({ ...banner, theme: { ...banner.theme, borderRadius: e.target.value } })}
            />
          </div>
          <div className="field">
            <label htmlFor="fontFamilyStudio">Font family</label>
            <input
              id="fontFamilyStudio"
              value={banner.theme.fontFamily}
              onChange={(e) => setBanner({ ...banner, theme: { ...banner.theme, fontFamily: e.target.value } })}
            />
          </div>
          <div className="field">
            <label htmlFor="logoUrlStudio">Logo URL</label>
            <input
              id="logoUrlStudio"
              type="url"
              value={banner.theme.logoUrl}
              onChange={(e) => setBanner({ ...banner, theme: { ...banner.theme, logoUrl: e.target.value } })}
            />
          </div>
        </>
      );
    }

    if (pane === 'css') {
      return (
        <>
          <div className="field">
            <label htmlFor="consentTemplateCss">Consent Template</label>
            <select
              id="consentTemplateCss"
              value={consentTemplateId}
              onChange={(e) => {
                const value = e.target.value as ConsentTemplateId | '';
                if (!value) {
                  setConsentTemplateId('');
                  return;
                }
                applyConsentTemplate(value);
              }}
            >
              <option value="">Choose a template…</option>
              {CONSENT_TEMPLATES.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.label}
                </option>
              ))}
            </select>
          </div>
          <p className="cy-banner-hint">
            {selectedTemplate?.description ?? 'Add custom CSS scoped to the banner preview.'}
          </p>
          <h3>Custom CSS</h3>
          <div className="field">
            <label htmlFor="customCssStudio">Add your custom css here</label>
            <textarea
              id="customCssStudio"
              className="cy-banner-css"
              rows={16}
              maxLength={4000}
              value={banner.theme.customCss}
              onChange={(e) => setBanner({ ...banner, theme: { ...banner.theme, customCss: e.target.value } })}
              placeholder={'.cmp-banner {\n  /* your styles */\n}'}
            />
          </div>
        </>
      );
    }

    if (pane === 'categories') {
      return (
        <>
          <h3>Consent categories</h3>
          <form onSubmit={addCategory} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Custom category name"
              required
            />
            <button className="btn" type="submit">
              Add
            </button>
          </form>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Enabled</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category, index) => (
                <tr key={category.id}>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                      <button className="btn btn-secondary" type="button" onClick={() => moveCategory(index, -1)}>
                        ↑
                      </button>
                      <button className="btn btn-secondary" type="button" onClick={() => moveCategory(index, 1)}>
                        ↓
                      </button>
                      <span>{category.name}</span>
                    </div>
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={category.enabled}
                      disabled={category.slug === 'strictly_necessary'}
                      onChange={(e) => updateCategory(category, { enabled: e.target.checked })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      );
    }

    if (pane === 'regional') {
      return (
        <>
          <h3>Geo targeting</h3>
          <div className="field">
            <label>
              <input
                type="checkbox"
                checked={Boolean(geoSettings.enabled)}
                onChange={(e) => setGeoSettings({ ...geoSettings, enabled: e.target.checked })}
              />{' '}
              Enable regional rules
            </label>
          </div>
          <div className="field">
            <label htmlFor="defaultProfileId">Default profile</label>
            <select
              id="defaultProfileId"
              value={geoSettings.defaultProfileId ?? 'generic_opt_in'}
              onChange={(e) => setGeoSettings({ ...geoSettings, defaultProfileId: e.target.value })}
            >
              {REGULATION_PROFILE_OPTIONS.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
          </div>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => setGeoSettings({ ...geoSettings, regionalRules: DEFAULT_REGIONAL_RULES })}
          >
            Reset default rules
          </button>
          <ul style={{ paddingLeft: '1.1rem', fontSize: '0.8125rem' }}>
            {(geoSettings.regionalRules ?? []).map((rule) => (
              <li key={rule.id} style={{ marginBottom: '0.35rem' }}>
                <strong>{rule.name}</strong> →{' '}
                {REGULATION_PROFILE_OPTIONS.find((p) => p.id === rule.profileId)?.name ?? rule.profileId}
              </li>
            ))}
          </ul>
          <h4>Google Consent Mode</h4>
          <div className="field">
            <label>
              <input
                type="checkbox"
                checked={googleConsentMode.enabled}
                onChange={(e) => setGoogleConsentMode({ ...googleConsentMode, enabled: e.target.checked })}
              />{' '}
              Enable GCM
            </label>
          </div>
          <div className="field">
            <label htmlFor="gcmMode">Mode</label>
            <select
              id="gcmMode"
              value={googleConsentMode.mode}
              onChange={(e) =>
                setGoogleConsentMode({
                  ...googleConsentMode,
                  mode: e.target.value as GoogleConsentModeConfig['mode'],
                })
              }
            >
              <option value="advanced">Advanced</option>
              <option value="basic">Basic</option>
            </select>
          </div>
          <button className="btn" type="button" onClick={saveRegulationSettings}>
            Save geo &amp; GCM
          </button>
        </>
      );
    }

    if (pane === 'policy') {
      return (
        <>
          <h3>Policy versions</h3>
          <div className="field">
            <label htmlFor="scheduleAt">Schedule publish</label>
            <input
              id="scheduleAt"
              type="datetime-local"
              value={scheduleAt}
              onChange={(e) => setScheduleAt(e.target.value)}
            />
          </div>
          <button className="btn btn-secondary" type="button" onClick={scheduleDraft}>
            Schedule draft
          </button>
          <table style={{ marginTop: '1rem' }}>
            <thead>
              <tr>
                <th>Version</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {policies.map((policy) => (
                <tr key={policy.id}>
                  <td>v{policy.versionNumber}</td>
                  <td>{policy.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Link className="btn btn-secondary" href={`/websites/${domainId}/test-banner`} style={{ marginTop: '1rem' }}>
            Test live banner
          </Link>
        </>
      );
    }

    return (
      <>
        <h3>Consent renewal</h3>
        <div className="field">
          <label htmlFor="renewalReason">Reason</label>
          <select id="renewalReason" value={renewalReason} onChange={(e) => setRenewalReason(e.target.value)}>
            <option value="policy_materially_changed">Policy materially changed</option>
            <option value="new_vendor_added">New vendor added</option>
            <option value="admin_requested">Administrator requested</option>
            <option value="regulation_changed">Regulation changed</option>
          </select>
        </div>
        <button className="btn" type="button" onClick={triggerRenewal}>
          Trigger renewal
        </button>
        <table style={{ marginTop: '1rem' }}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {renewals.length === 0 ? (
              <tr>
                <td colSpan={2} style={{ color: 'var(--muted)' }}>
                  No renewals yet
                </td>
              </tr>
            ) : (
              renewals.map((renewal) => (
                <tr key={renewal.id}>
                  <td>{new Date(renewal.createdAt).toLocaleString()}</td>
                  <td>{renewal.reason}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </>
    );
  }

  return (
    <ProtectedLayout>
      <WebsiteLayout domainId={domainId} hostname={hostname || undefined}>
        <BannerStudio
          pane={pane}
          onPaneChange={setPane}
          canPublish={Boolean(draft)}
          publishing={publishing}
          onPublish={publishDraft}
          onSaveDraft={() => {
            void saveConsentTemplateAndBanner();
          }}
          viewport={previewViewport}
          onViewportChange={setPreviewViewport}
          status={message}
          error={error}
          panel={renderPanel()}
          preview={
            <BannerPreview
              title={banner.title}
              description={banner.description}
              contentFormat={banner.contentFormat}
              acceptButton={banner.acceptButton}
              rejectButton={banner.rejectButton}
              preferencesButton={banner.preferencesButton}
              saveButton={banner.saveButton}
              closeButton={banner.closeButton}
              legalNotice={banner.legalNotice}
              footerContent={banner.footerContent}
              privacyPolicyUrl={banner.privacyPolicyUrl}
              cookiePolicyUrl={banner.cookiePolicyUrl}
              layout={banner.layout}
              theme={banner.theme}
              viewport={previewViewport}
              websiteUrl={hostname || null}
              variant="studio"
              allowClose={banner.behavior.allowClose}
            />
          }
        />
      </WebsiteLayout>
    </ProtectedLayout>
  );
}
