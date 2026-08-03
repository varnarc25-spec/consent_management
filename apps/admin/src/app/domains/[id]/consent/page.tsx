'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { BannerPreview } from '@/components/banner-preview';
import { ProtectedLayout } from '@/components/protected-layout';
import { apiFetch } from '@/lib/api';
import { BANNER_TEXT_TEMPLATES } from '@cmp/utils/banner-templates';
import {
  DEFAULT_REGIONAL_RULES,
  listRegulationProfiles,
  applyRegulationProfile,
  resolveGeoRegulation,
  type RegionalRule,
} from '@cmp/utils';
import {
  COMMON_LANGUAGE_OPTIONS,
  applyBannerTranslation,
  getBannerContrastWarnings,
  isRtlLanguage,
  listMissingBannerTranslations,
  listMissingCategoryTranslations,
  type BannerTranslationEntry,
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
  scriptMappings?: {
    scripts?: string[];
    iframes?: string[];
    pixels?: string[];
  } | null;
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
  embedPlaceholders: Record<string, { title: string; description: string; allowLabel: string }>;
  translations?: Record<string, BannerTranslationEntry>;
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

type Tab = 'categories' | 'banner' | 'languages' | 'policy' | 'regional' | 'renewals';

interface GeoRegulationSettings {
  enabled: boolean;
  defaultProfileId: string;
  regionalRules: RegionalRule[];
}

const REGULATION_PROFILE_OPTIONS = listRegulationProfiles();

function mergeGeoSettings(config?: GeoRegulationSettings | null): GeoRegulationSettings {
  return {
    enabled: config?.enabled ?? true,
    defaultProfileId: config?.defaultProfileId ?? 'generic_opt_in',
    regionalRules: config?.regionalRules ?? DEFAULT_REGIONAL_RULES,
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
    primaryColor: '#2563eb',
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
  embedPlaceholders: {},
  translations: {},
});

function parsePageList(value: string[] | string | undefined): string {
  if (Array.isArray(value)) return value.join(', ');
  return value ?? '';
}

function splitMappingList(values?: string[]) {
  return (values ?? []).join(', ');
}

function parseMappingList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function mappingsToFields(mappings?: Category['scriptMappings']) {
  return {
    scripts: splitMappingList(mappings?.scripts),
    iframes: splitMappingList(mappings?.iframes),
    pixels: splitMappingList(mappings?.pixels),
  };
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
    embedPlaceholders: { ...base.embedPlaceholders, ...(content.embedPlaceholders ?? {}) },
    behavior: {
      ...base.behavior,
      ...(content.behavior ?? {}),
      showOnPages: parsePageList(behavior?.showOnPages ?? base.behavior.showOnPages),
      excludePages: parsePageList(behavior?.excludePages ?? base.behavior.excludePages),
    },
    theme: { ...base.theme, ...(content.theme ?? {}) },
    privacyTrigger: { ...base.privacyTrigger, ...(content.privacyTrigger ?? {}) },
    translations: { ...base.translations, ...(content.translations ?? {}) },
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
  const [tab, setTab] = useState<Tab>('banner');
  const [categories, setCategories] = useState<Category[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [draft, setDraft] = useState<Policy | null>(null);
  const [renewals, setRenewals] = useState<Renewal[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [geoSettings, setGeoSettings] = useState<GeoRegulationSettings>(mergeGeoSettings());
  const [googleConsentMode, setGoogleConsentMode] = useState<GoogleConsentModeConfig>(defaultGoogleConsentMode());
  const [previewCountry, setPreviewCountry] = useState('DE');
  const [banner, setBanner] = useState<BannerState>(defaultBanner());
  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [scheduleAt, setScheduleAt] = useState('');
  const [renewalReason, setRenewalReason] = useState('admin_requested');
  const [textTemplate, setTextTemplate] = useState('');
  const [supportedLanguages, setSupportedLanguages] = useState<string[]>(['en']);
  const [defaultLanguage, setDefaultLanguage] = useState('en');
  const [editingLanguage, setEditingLanguage] = useState('de');
  const [rtlPreview, setRtlPreview] = useState(false);
  const [previewLanguage, setPreviewLanguage] = useState('en');
  const [mappingEdits, setMappingEdits] = useState<
    Record<string, { scripts: string; iframes: string; pixels: string }>
  >({});

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

  const vendorKeys = Array.from(
    new Set(
      categories.flatMap((category) => category.vendorPurposes ?? []).filter(Boolean),
    ),
  );

  function loadCategories() {
    apiFetch<Category[]>(`/domains/${domainId}/consent/categories`).then((r) => {
      if (r.data) {
        setCategories(r.data);
        setMappingEdits(
          Object.fromEntries(r.data.map((category) => [category.id, mappingsToFields(category.scriptMappings)])),
        );
      }
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
        const regulation = r.data.regulationConfig as Policy['regulationConfig'];
        setGoogleConsentMode(mergeGoogleConsentMode(regulation?.googleConsentMode));
        setGeoSettings(mergeGeoSettings(regulation?.geo as GeoRegulationSettings | undefined));
        const langs = (r.data.supportedLanguages as string[] | null) ?? ['en'];
        setSupportedLanguages(langs);
        const legal = r.data.legalText as Policy['legalText'];
        setDefaultLanguage(legal?.defaultLanguage ?? langs[0] ?? 'en');
        const nonDefault = langs.find((code) => code !== (legal?.defaultLanguage ?? langs[0] ?? 'en'));
        if (nonDefault) setEditingLanguage(nonDefault);
      }
    });
  }

  function loadRenewals() {
    apiFetch<Renewal[]>(`/domains/${domainId}/consent/renewals`).then((r) => {
      if (r.data) setRenewals(r.data);
    });
  }

  useEffect(() => {
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

  async function saveCategoryMappings(category: Category) {
    const fields = mappingEdits[category.id];
    if (!fields) return;
    setError('');
    await updateCategory(category, {
      scriptMappings: {
        scripts: parseMappingList(fields.scripts),
        iframes: parseMappingList(fields.iframes),
        pixels: parseMappingList(fields.pixels),
      },
    });
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

  function buildRegulationConfigPatch() {
    return {
      regulationConfig: {
        googleConsentMode: googleConsentMode,
        geo: geoSettings,
      },
    };
  }

  async function saveGeoSettings() {
    if (!draft) return;
    setError('');
    const result = await apiFetch<Policy>(`/domains/${domainId}/consent/policies/${draft.id}`, {
      method: 'PATCH',
      body: JSON.stringify(buildRegulationConfigPatch()),
    });
    if (result.ok) {
      setMessage('Regional settings saved');
      loadPolicies();
    } else {
      setError(result.error?.message ?? 'Failed to save regional settings');
    }
  }

  function previewBannerForCountry(country: string): BannerState {
    const resolved = resolveGeoRegulation(
      { country, region: country, language: 'en' },
      geoSettings,
    );
    const categorySnapshots = categories.map((c) => ({
      slug: c.slug,
      defaultState: c.defaultState,
      enabled: c.enabled,
    }));
    const applied = applyRegulationProfile(
      serializeBanner(banner) as Record<string, unknown>,
      categorySnapshots,
      resolved.profile,
      resolved.matchedRule,
    );
    return mergeBanner(applied.banner as Partial<BannerState>);
  }

  function previewBannerForLanguage(lang: string): BannerState {
    const geoBanner = previewBannerForCountry(previewCountry);
    const serialized = {
      ...serializeBanner(geoBanner),
      translations: banner.translations,
    };
    if (lang === defaultLanguage) return mergeBanner(serialized as unknown as Partial<BannerState>);
    const localized = applyBannerTranslation(serialized, lang, supportedLanguages);
    return mergeBanner(localized as unknown as Partial<BannerState>);
  }

  function toggleSupportedLanguage(code: string) {
    setSupportedLanguages((current) => {
      if (current.includes(code)) {
        const next = current.filter((item) => item !== code);
        return next.length ? next : ['en'];
      }
      return [...current, code].sort();
    });
  }

  function updateTranslationField(
    lang: string,
    field: keyof BannerTranslationEntry,
    value: string,
  ) {
    setBanner((current) => ({
      ...current,
      translations: {
        ...current.translations,
        [lang]: {
          ...current.translations?.[lang],
          [field]: value,
        },
      },
    }));
  }

  function updateTranslationCategoryField(
    lang: string,
    slug: string,
    field: 'name' | 'description',
    value: string,
  ) {
    setBanner((current) => {
      const entry = current.translations?.[lang] ?? {};
      if (field === 'name') {
        return {
          ...current,
          translations: {
            ...current.translations,
            [lang]: {
              ...entry,
              categoryNames: { ...entry.categoryNames, [slug]: value },
            },
          },
        };
      }
      return {
        ...current,
        translations: {
          ...current.translations,
          [lang]: {
            ...entry,
            categoryDescriptions: { ...entry.categoryDescriptions, [slug]: value },
          },
        },
      };
    });
  }

  async function saveLanguages() {
    if (!draft) return;
    setError('');
    const langs = supportedLanguages.includes(defaultLanguage)
      ? supportedLanguages
      : [defaultLanguage, ...supportedLanguages];
    const result = await apiFetch<Policy>(`/domains/${domainId}/consent/policies/${draft.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        supportedLanguages: langs,
        legalText: { defaultLanguage },
        bannerContent: serializeBanner(banner),
      }),
    });
    if (result.ok) {
      setMessage('Language settings saved');
      loadPolicies();
    } else {
      setError(result.error?.message ?? 'Failed to save language settings');
    }
  }

  async function suggestTranslations() {
    if (!draft) return;
    setError('');
    const result = await apiFetch<{
      suggestions: BannerTranslationEntry;
      disclaimer?: string;
    }>(`/domains/${domainId}/consent/policies/${draft.id}/translation-suggestions`, {
      method: 'POST',
      body: JSON.stringify({
        targetLanguage: editingLanguage,
        source: {
          title: banner.title,
          description: banner.description,
          acceptButton: banner.acceptButton,
          rejectButton: banner.rejectButton,
          preferencesButton: banner.preferencesButton,
          saveButton: banner.saveButton,
          closeButton: banner.closeButton,
          legalNotice: banner.legalNotice,
          footerContent: banner.footerContent,
          privacyTrigger: { label: banner.privacyTrigger.label },
        },
      }),
    });
    if (result.ok && result.data?.suggestions) {
      setBanner((current) => ({
        ...current,
        translations: {
          ...current.translations,
          [editingLanguage]: {
            ...current.translations?.[editingLanguage],
            ...result.data!.suggestions,
          },
        },
      }));
      setMessage(result.data.disclaimer ?? 'Translation suggestions applied — review before publishing');
    } else {
      setError(result.error?.message ?? 'Failed to fetch translation suggestions');
    }
  }

  async function saveGoogleConsentMode() {
    if (!draft) return;
    setError('');
    const result = await apiFetch<Policy>(`/domains/${domainId}/consent/policies/${draft.id}`, {
      method: 'PATCH',
      body: JSON.stringify(buildRegulationConfigPatch()),
    });
    if (result.ok) {
      setMessage('Google Consent Mode settings saved');
      loadPolicies();
    } else {
      setError(result.error?.message ?? 'Failed to save Google Consent Mode settings');
    }
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
      body: JSON.stringify({ bannerContent: serializeBanner(banner) }),
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

  const themeContrastWarnings = getBannerContrastWarnings(banner.theme);
  const editingTranslation = banner.translations?.[editingLanguage];
  const missingBannerFields = listMissingBannerTranslations(
    {
      title: banner.title,
      description: banner.description,
      acceptButton: banner.acceptButton,
      rejectButton: banner.rejectButton,
      preferencesButton: banner.preferencesButton,
      saveButton: banner.saveButton,
      closeButton: banner.closeButton,
      legalNotice: banner.legalNotice,
      footerContent: banner.footerContent,
    },
    editingTranslation,
  );
  const missingCategoryFields = listMissingCategoryTranslations(categories, editingTranslation);
  const previewLang = rtlPreview ? editingLanguage : previewLanguage;
  const previewDir = rtlPreview || isRtlLanguage(previewLang) ? 'rtl' : 'ltr';

  return (
    <ProtectedLayout>
      <p><Link href={`/domains/${domainId}`}>← Back to domain</Link></p>
      <h1>Consent configuration</h1>
      <p style={{ color: 'var(--muted)' }}>Manage categories, banner layout, behavior, and policy versions.</p>

      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}

      <div style={{ display: 'flex', gap: '0.5rem', margin: '1.5rem 0', flexWrap: 'wrap' }}>
        {(['categories', 'banner', 'languages', 'policy', 'regional', 'renewals'] as Tab[]).map((item) => (
          <button
            key={item}
            className={tab === item ? 'btn' : 'btn btn-secondary'}
            type="button"
            onClick={() => setTab(item)}
          >
            {item === 'languages' ? 'Languages' : item.charAt(0).toUpperCase() + item.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'categories' && (
        <div className="card">
          <h3>Consent categories</h3>
          <form onSubmit={addCategory} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Custom category name" required />
            <button className="btn" type="submit">Add category</button>
          </form>
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Name</th>
                <th>Slug</th>
                <th>Required</th>
                <th>Enabled</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category, index) => (
                <tr key={category.id}>
                  <td>
                    <button className="btn btn-secondary" type="button" onClick={() => moveCategory(index, -1)}>↑</button>
                    <button className="btn btn-secondary" type="button" onClick={() => moveCategory(index, 1)}>↓</button>
                  </td>
                  <td>{category.name}</td>
                  <td><code>{category.slug}</code></td>
                  <td>{category.required ? 'Yes' : 'No'}</td>
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

          <h4 style={{ marginTop: '1.5rem' }}>Script-to-category mappings</h4>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
            URL substrings or <code>/regex/</code> patterns used by manual blocking. Inline elements can also use{' '}
            <code>data-cmp-category</code>.
          </p>
          {categories.map((category) => {
            const fields = mappingEdits[category.id] ?? mappingsToFields(category.scriptMappings);
            return (
              <div key={`mapping-${category.id}`} className="card" style={{ marginBottom: '1rem' }}>
                <h4 style={{ marginTop: 0 }}>
                  {category.name} <code>{category.slug}</code>
                </h4>
                <div className="field">
                  <label htmlFor={`scripts-${category.id}`}>External scripts</label>
                  <input
                    id={`scripts-${category.id}`}
                    value={fields.scripts}
                    placeholder="googletagmanager.com, connect.facebook.net"
                    onChange={(e) =>
                      setMappingEdits((current) => ({
                        ...current,
                        [category.id]: { ...fields, scripts: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className="field">
                  <label htmlFor={`iframes-${category.id}`}>Iframes / embeds</label>
                  <input
                    id={`iframes-${category.id}`}
                    value={fields.iframes}
                    placeholder="youtube.com/embed, player.vimeo.com"
                    onChange={(e) =>
                      setMappingEdits((current) => ({
                        ...current,
                        [category.id]: { ...fields, iframes: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className="field">
                  <label htmlFor={`pixels-${category.id}`}>Tracking pixels</label>
                  <input
                    id={`pixels-${category.id}`}
                    value={fields.pixels}
                    placeholder="facebook.com/tr, doubleclick.net"
                    onChange={(e) =>
                      setMappingEdits((current) => ({
                        ...current,
                        [category.id]: { ...fields, pixels: e.target.value },
                      }))
                    }
                  />
                </div>
                <button className="btn btn-secondary" type="button" onClick={() => saveCategoryMappings(category)}>
                  Save mappings
                </button>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'banner' && (
        <div className="grid-2">
          <form className="card" onSubmit={saveBanner}>
            <h3>Banner editor</h3>
            <div className="field">
              <label htmlFor="textTemplate">Text template</label>
              <select
                id="textTemplate"
                value={textTemplate}
                onChange={(e) => {
                  setTextTemplate(e.target.value);
                  if (e.target.value) applyTextTemplate(e.target.value);
                }}
              >
                <option value="">Choose a template…</option>
                {BANNER_TEXT_TEMPLATES.map((template) => (
                  <option key={template.id} value={template.id}>{template.label}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="layout">Layout</label>
              <select id="layout" value={banner.layout} onChange={(e) => setBanner({ ...banner, layout: e.target.value })}>
                <option value="bottom_bar">Bottom bar</option>
                <option value="top_bar">Top bar</option>
                <option value="center_modal">Center modal</option>
                <option value="multi_step_modal">Multi-step modal</option>
                <option value="corner_popup">Corner popup</option>
                <option value="fullscreen">Full-screen overlay</option>
                <option value="side_panel">Side panel</option>
                <option value="compact">Compact banner</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="contentFormat">Description format</label>
              <select
                id="contentFormat"
                value={banner.contentFormat}
                onChange={(e) => setBanner({ ...banner, contentFormat: e.target.value as BannerState['contentFormat'] })}
              >
                <option value="plain">Plain text</option>
                <option value="basic_html">Basic HTML (strong, em, links, lists)</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="title">Title</label>
              <input id="title" value={banner.title} onChange={(e) => setBanner({ ...banner, title: e.target.value })} required />
            </div>
            <div className="field">
              <label htmlFor="description">Description ({banner.description.length}/2000)</label>
              <textarea id="description" rows={4} maxLength={2000} value={banner.description} onChange={(e) => setBanner({ ...banner, description: e.target.value })} required />
            </div>
            <div className="field">
              <label htmlFor="acceptButton">Accept button</label>
              <input id="acceptButton" value={banner.acceptButton} onChange={(e) => setBanner({ ...banner, acceptButton: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="rejectButton">Reject button</label>
              <input id="rejectButton" value={banner.rejectButton} onChange={(e) => setBanner({ ...banner, rejectButton: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="preferencesButton">Customize button</label>
              <input id="preferencesButton" value={banner.preferencesButton} onChange={(e) => setBanner({ ...banner, preferencesButton: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="saveButton">Save preferences button</label>
              <input id="saveButton" value={banner.saveButton} onChange={(e) => setBanner({ ...banner, saveButton: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="closeButton">Close button label</label>
              <input id="closeButton" value={banner.closeButton} onChange={(e) => setBanner({ ...banner, closeButton: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="legalNotice">Legal notice</label>
              <textarea id="legalNotice" rows={2} value={banner.legalNotice} onChange={(e) => setBanner({ ...banner, legalNotice: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="footerContent">Footer content</label>
              <textarea id="footerContent" rows={2} value={banner.footerContent} onChange={(e) => setBanner({ ...banner, footerContent: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="privacyPolicyUrl">Privacy policy URL</label>
              <input id="privacyPolicyUrl" type="url" value={banner.privacyPolicyUrl} onChange={(e) => setBanner({ ...banner, privacyPolicyUrl: e.target.value })} placeholder="https://example.com/privacy" />
            </div>
            <div className="field">
              <label htmlFor="cookiePolicyUrl">Cookie policy URL</label>
              <input id="cookiePolicyUrl" type="url" value={banner.cookiePolicyUrl} onChange={(e) => setBanner({ ...banner, cookiePolicyUrl: e.target.value })} placeholder="https://example.com/cookies" />
            </div>
            <h4 style={{ marginTop: '1.5rem' }}>Category copy overrides</h4>
            {categories.map((category) => (
              <div className="field" key={category.id}>
                <label htmlFor={`cat-desc-${category.slug}`}>{category.name} description</label>
                <textarea
                  id={`cat-desc-${category.slug}`}
                  rows={2}
                  maxLength={500}
                  value={banner.categoryDescriptions[category.slug] ?? ''}
                  placeholder={category.description ?? 'Optional override shown in preferences'}
                  onChange={(e) =>
                    setBanner({
                      ...banner,
                      categoryDescriptions: {
                        ...banner.categoryDescriptions,
                        [category.slug]: e.target.value,
                      },
                    })
                  }
                />
              </div>
            ))}
            {vendorKeys.length > 0 && (
              <>
                <h4 style={{ marginTop: '1rem' }}>Vendor descriptions</h4>
                {vendorKeys.map((vendorKey) => (
                  <div className="field" key={vendorKey}>
                    <label htmlFor={`vendor-desc-${vendorKey}`}>{vendorKey}</label>
                    <textarea
                      id={`vendor-desc-${vendorKey}`}
                      rows={2}
                      maxLength={500}
                      value={banner.vendorDescriptions[vendorKey] ?? ''}
                      onChange={(e) =>
                        setBanner({
                          ...banner,
                          vendorDescriptions: {
                            ...banner.vendorDescriptions,
                            [vendorKey]: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                ))}
              </>
            )}
            <h4 style={{ marginTop: '1.5rem' }}>Embed placeholder overrides</h4>
            <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
              Shown when iframes are blocked until consent is granted for the category.
            </p>
            {categories
              .filter((category) => category.slug !== 'strictly_necessary')
              .map((category) => {
                const placeholder = banner.embedPlaceholders[category.slug] ?? {
                  title: '',
                  description: '',
                  allowLabel: '',
                };
                return (
                  <div key={`placeholder-${category.slug}`} style={{ marginBottom: '1rem' }}>
                    <h5>{category.name}</h5>
                    <div className="field">
                      <label htmlFor={`ph-title-${category.slug}`}>Title</label>
                      <input
                        id={`ph-title-${category.slug}`}
                        value={placeholder.title}
                        placeholder="Content blocked until consent"
                        onChange={(e) =>
                          setBanner({
                            ...banner,
                            embedPlaceholders: {
                              ...banner.embedPlaceholders,
                              [category.slug]: { ...placeholder, title: e.target.value },
                            },
                          })
                        }
                      />
                    </div>
                    <div className="field">
                      <label htmlFor={`ph-desc-${category.slug}`}>Description</label>
                      <textarea
                        id={`ph-desc-${category.slug}`}
                        rows={2}
                        maxLength={500}
                        value={placeholder.description}
                        placeholder={`${category.name} content is blocked until you grant consent.`}
                        onChange={(e) =>
                          setBanner({
                            ...banner,
                            embedPlaceholders: {
                              ...banner.embedPlaceholders,
                              [category.slug]: { ...placeholder, description: e.target.value },
                            },
                          })
                        }
                      />
                    </div>
                    <div className="field">
                      <label htmlFor={`ph-allow-${category.slug}`}>Allow button label</label>
                      <input
                        id={`ph-allow-${category.slug}`}
                        value={placeholder.allowLabel}
                        placeholder="Allow this content"
                        onChange={(e) =>
                          setBanner({
                            ...banner,
                            embedPlaceholders: {
                              ...banner.embedPlaceholders,
                              [category.slug]: { ...placeholder, allowLabel: e.target.value },
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                );
              })}
            <h4 style={{ marginTop: '1.5rem' }}>Behavior</h4>
            <div className="field">
              <label><input type="checkbox" checked={banner.behavior.displayOnFirstVisit} onChange={(e) => setBanner({ ...banner, behavior: { ...banner.behavior, displayOnFirstVisit: e.target.checked } })} /> Display on first visit</label>
            </div>
            <div className="field">
              <label><input type="checkbox" checked={banner.behavior.displayWhenPolicyChanges} onChange={(e) => setBanner({ ...banner, behavior: { ...banner.behavior, displayWhenPolicyChanges: e.target.checked } })} /> Display when policy changes</label>
            </div>
            <div className="field">
              <label><input type="checkbox" checked={banner.behavior.displayAfterConsentExpires} onChange={(e) => setBanner({ ...banner, behavior: { ...banner.behavior, displayAfterConsentExpires: e.target.checked } })} /> Re-show after consent expires</label>
            </div>
            <div className="field">
              <label><input type="checkbox" checked={banner.behavior.rememberChoice} onChange={(e) => setBanner({ ...banner, behavior: { ...banner.behavior, rememberChoice: e.target.checked } })} /> Remember visitor choice</label>
            </div>
            <div className="field">
              <label><input type="checkbox" checked={banner.behavior.allowClose} onChange={(e) => setBanner({ ...banner, behavior: { ...banner.behavior, allowClose: e.target.checked } })} /> Allow close without choosing</label>
            </div>
            <div className="field">
              <label><input type="checkbox" checked={banner.behavior.blockInteractionUntilChoice} onChange={(e) => setBanner({ ...banner, behavior: { ...banner.behavior, blockInteractionUntilChoice: e.target.checked } })} /> Block interaction until choice</label>
            </div>
            <div className="field">
              <label><input type="checkbox" checked={banner.behavior.displayAfterInteraction} onChange={(e) => setBanner({ ...banner, behavior: { ...banner.behavior, displayAfterInteraction: e.target.checked } })} /> Display after first user interaction</label>
            </div>
            <div className="field">
              <label><input type="checkbox" checked={banner.behavior.respectGlobalPrivacyControl} onChange={(e) => setBanner({ ...banner, behavior: { ...banner.behavior, respectGlobalPrivacyControl: e.target.checked } })} /> Respect Global Privacy Control (GPC)</label>
            </div>
            <div className="field">
              <label htmlFor="displayDelayMs">Display delay (ms)</label>
              <input id="displayDelayMs" type="number" min={0} value={banner.behavior.displayDelayMs} onChange={(e) => setBanner({ ...banner, behavior: { ...banner.behavior, displayDelayMs: Number(e.target.value) } })} />
            </div>
            <div className="field">
              <label htmlFor="displayAfterScrollPercent">Display after scroll (%)</label>
              <input id="displayAfterScrollPercent" type="number" min={0} max={100} value={banner.behavior.displayAfterScrollPercent} onChange={(e) => setBanner({ ...banner, behavior: { ...banner.behavior, displayAfterScrollPercent: Number(e.target.value) } })} />
            </div>
            <div className="field">
              <label htmlFor="showOnPages">Show only on pages (comma-separated paths)</label>
              <input id="showOnPages" value={banner.behavior.showOnPages} onChange={(e) => setBanner({ ...banner, behavior: { ...banner.behavior, showOnPages: e.target.value } })} placeholder="/, /products/*" />
            </div>
            <div className="field">
              <label htmlFor="excludePages">Exclude pages (comma-separated paths)</label>
              <input id="excludePages" value={banner.behavior.excludePages} onChange={(e) => setBanner({ ...banner, behavior: { ...banner.behavior, excludePages: e.target.value } })} placeholder="/admin, /checkout/*" />
            </div>
            <div className="field">
              <label htmlFor="consentExpirationDays">Consent expiration (days)</label>
              <input id="consentExpirationDays" type="number" min={0} value={banner.behavior.consentExpirationDays} onChange={(e) => setBanner({ ...banner, behavior: { ...banner.behavior, consentExpirationDays: Number(e.target.value) } })} />
            </div>
            <h4 style={{ marginTop: '1.5rem' }}>Theme</h4>
            <div className="field">
              <label htmlFor="primaryColor">Primary color</label>
              <input id="primaryColor" type="color" value={banner.theme.primaryColor} onChange={(e) => setBanner({ ...banner, theme: { ...banner.theme, primaryColor: e.target.value } })} />
            </div>
            <div className="field">
              <label htmlFor="backgroundColor">Background color</label>
              <input id="backgroundColor" type="color" value={banner.theme.backgroundColor} onChange={(e) => setBanner({ ...banner, theme: { ...banner.theme, backgroundColor: e.target.value } })} />
            </div>
            <div className="field">
              <label htmlFor="textColor">Text color</label>
              <input id="textColor" type="color" value={banner.theme.textColor} onChange={(e) => setBanner({ ...banner, theme: { ...banner.theme, textColor: e.target.value } })} />
            </div>
            <div className="field">
              <label htmlFor="buttonTextColor">Button text color</label>
              <input id="buttonTextColor" type="color" value={banner.theme.buttonTextColor} onChange={(e) => setBanner({ ...banner, theme: { ...banner.theme, buttonTextColor: e.target.value } })} />
            </div>
            <div className="field">
              <label htmlFor="borderRadius">Border radius</label>
              <input id="borderRadius" value={banner.theme.borderRadius} onChange={(e) => setBanner({ ...banner, theme: { ...banner.theme, borderRadius: e.target.value } })} placeholder="8px" />
            </div>
            <div className="field">
              <label htmlFor="buttonStyle">Button style</label>
              <select id="buttonStyle" value={banner.theme.buttonStyle} onChange={(e) => setBanner({ ...banner, theme: { ...banner.theme, buttonStyle: e.target.value as BannerState['theme']['buttonStyle'] } })}>
                <option value="filled">Filled</option>
                <option value="outline">Outline</option>
                <option value="soft">Soft</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="fontFamily">Font family</label>
              <input id="fontFamily" value={banner.theme.fontFamily} onChange={(e) => setBanner({ ...banner, theme: { ...banner.theme, fontFamily: e.target.value } })} />
            </div>
            <div className="field">
              <label htmlFor="fontSize">Font size</label>
              <input id="fontSize" value={banner.theme.fontSize} onChange={(e) => setBanner({ ...banner, theme: { ...banner.theme, fontSize: e.target.value } })} placeholder="16px" />
            </div>
            <div className="field">
              <label htmlFor="spacing">Spacing</label>
              <input id="spacing" value={banner.theme.spacing} onChange={(e) => setBanner({ ...banner, theme: { ...banner.theme, spacing: e.target.value } })} placeholder="1rem" />
            </div>
            <div className="field">
              <label htmlFor="shadow">Shadow</label>
              <input id="shadow" value={banner.theme.shadow} onChange={(e) => setBanner({ ...banner, theme: { ...banner.theme, shadow: e.target.value } })} />
            </div>
            <div className="field">
              <label htmlFor="overlayOpacity">Overlay opacity ({banner.theme.overlayOpacity})</label>
              <input id="overlayOpacity" type="range" min={0} max={1} step={0.05} value={banner.theme.overlayOpacity} onChange={(e) => setBanner({ ...banner, theme: { ...banner.theme, overlayOpacity: Number(e.target.value) } })} />
            </div>
            <div className="field">
              <label htmlFor="logoUrl">Logo URL</label>
              <input id="logoUrl" type="url" value={banner.theme.logoUrl} onChange={(e) => setBanner({ ...banner, theme: { ...banner.theme, logoUrl: e.target.value } })} placeholder="https://example.com/logo.png" />
            </div>
            <div className="field">
              <label htmlFor="customCss">Custom CSS (banner only)</label>
              <textarea id="customCss" rows={4} maxLength={4000} value={banner.theme.customCss} onChange={(e) => setBanner({ ...banner, theme: { ...banner.theme, customCss: e.target.value } })} placeholder="border-width: 2px;" />
            </div>
            {themeContrastWarnings.length > 0 && (
              <div style={{ marginTop: '0.75rem', fontSize: '0.8125rem' }}>
                <strong>Contrast checks</strong>
                {themeContrastWarnings.map((warning) => (
                  <p
                    key={warning.pair}
                    style={{ margin: '0.25rem 0', color: warning.passes === false ? '#b45309' : 'var(--muted)' }}
                  >
                    {warning.pair}: {warning.ratio ? warning.ratio.toFixed(2) : 'n/a'}:1
                    {warning.passes === false ? ' — may be too low for WCAG AA' : ''}
                  </p>
                ))}
              </div>
            )}
            <h4 style={{ marginTop: '1.5rem' }}>Privacy trigger</h4>
            <div className="field">
              <label><input type="checkbox" checked={banner.privacyTrigger.enabled} onChange={(e) => setBanner({ ...banner, privacyTrigger: { ...banner.privacyTrigger, enabled: e.target.checked } })} /> Show privacy trigger after consent</label>
            </div>
            <div className="field">
              <label htmlFor="privacyTriggerMode">Trigger mode</label>
              <select id="privacyTriggerMode" value={banner.privacyTrigger.mode} onChange={(e) => setBanner({ ...banner, privacyTrigger: { ...banner.privacyTrigger, mode: e.target.value as BannerState['privacyTrigger']['mode'] } })}>
                <option value="floating_icon">Floating icon</option>
                <option value="footer_link">Footer link</option>
                <option value="api_only">API only</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="privacyTriggerLabel">Trigger label</label>
              <input id="privacyTriggerLabel" value={banner.privacyTrigger.label} onChange={(e) => setBanner({ ...banner, privacyTrigger: { ...banner.privacyTrigger, label: e.target.value } })} />
            </div>
            <div className="field">
              <label htmlFor="privacyTriggerPosition">Floating position</label>
              <select id="privacyTriggerPosition" value={banner.privacyTrigger.position} onChange={(e) => setBanner({ ...banner, privacyTrigger: { ...banner.privacyTrigger, position: e.target.value as BannerState['privacyTrigger']['position'] } })}>
                <option value="bottom-right">Bottom right</option>
                <option value="bottom-left">Bottom left</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="footerSelector">Footer link selector</label>
              <input id="footerSelector" value={banner.privacyTrigger.footerSelector} onChange={(e) => setBanner({ ...banner, privacyTrigger: { ...banner.privacyTrigger, footerSelector: e.target.value } })} placeholder="footer .legal-links" />
            </div>
            <button className="btn" type="submit" disabled={publishing}>Save draft</button>
            <button className="btn" type="button" style={{ marginLeft: '0.5rem' }} onClick={publishDraft} disabled={publishing}>
              {publishing ? 'Publishing…' : 'Publish'}
            </button>
            <Link className="btn btn-secondary" href={`/domains/${domainId}/test-banner`} style={{ marginLeft: '0.5rem' }}>
              Test live banner
            </Link>
            {(message || error) && (
              <p
                className={error ? 'error' : 'success'}
                style={{ marginTop: '1rem', fontWeight: 500 }}
                role="status"
              >
                {error || message}
              </p>
            )}
          </form>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <h3>Live preview</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <select value={previewCountry} onChange={(e) => setPreviewCountry(e.target.value)}>
                  <option value="DE">Preview: Germany (GDPR)</option>
                  <option value="GB">Preview: UK</option>
                  <option value="US">Preview: United States</option>
                  <option value="BR">Preview: Brazil</option>
                  <option value="CA">Preview: Canada</option>
                  <option value="JP">Preview: Japan (default)</option>
                </select>
                <select value={previewLanguage} onChange={(e) => setPreviewLanguage(e.target.value)}>
                  {supportedLanguages.map((code) => (
                    <option key={code} value={code}>
                      Preview: {COMMON_LANGUAGE_OPTIONS.find((o) => o.code === code)?.label ?? code}
                    </option>
                  ))}
                </select>
                <select value={previewViewport} onChange={(e) => setPreviewViewport(e.target.value as typeof previewViewport)}>
                  <option value="desktop">Desktop</option>
                  <option value="tablet">Tablet</option>
                  <option value="mobile">Mobile</option>
                </select>
              </div>
            </div>
            <BannerPreview
              title={previewBannerForLanguage(previewLang).title}
              description={previewBannerForLanguage(previewLang).description}
              contentFormat={previewBannerForLanguage(previewLang).contentFormat}
              acceptButton={previewBannerForLanguage(previewLang).acceptButton}
              rejectButton={previewBannerForLanguage(previewLang).rejectButton}
              preferencesButton={previewBannerForLanguage(previewLang).preferencesButton}
              saveButton={previewBannerForLanguage(previewLang).saveButton}
              closeButton={previewBannerForLanguage(previewLang).closeButton}
              legalNotice={previewBannerForLanguage(previewLang).legalNotice}
              footerContent={previewBannerForLanguage(previewLang).footerContent}
              privacyPolicyUrl={previewBannerForLanguage(previewLang).privacyPolicyUrl}
              cookiePolicyUrl={previewBannerForLanguage(previewLang).cookiePolicyUrl}
              layout={previewBannerForLanguage(previewLang).layout}
              theme={previewBannerForLanguage(previewLang).theme}
              viewport={previewViewport}
              dir={previewDir}
            />
          </div>
        </div>
      )}

      {tab === 'languages' && (
        <div className="grid-2">
          <div className="card">
            <h3>Languages & translations</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
              Default copy is edited on the Banner tab. Add translations for additional languages below.
              Visitors receive content based on URL <code>cmp_lang</code>, stored preference, script{' '}
              <code>data-lang</code>, or browser language.
            </p>

            <h4 style={{ marginTop: '1.25rem' }}>Supported languages</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
              {COMMON_LANGUAGE_OPTIONS.map((option) => (
                <label key={option.code} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <input
                    type="checkbox"
                    checked={supportedLanguages.includes(option.code)}
                    onChange={() => toggleSupportedLanguage(option.code)}
                  />
                  {option.label}
                  {option.rtl ? ' (RTL)' : ''}
                </label>
              ))}
            </div>

            <div className="field">
              <label htmlFor="defaultLanguage">Default language</label>
              <select
                id="defaultLanguage"
                value={defaultLanguage}
                onChange={(e) => setDefaultLanguage(e.target.value)}
              >
                {supportedLanguages.map((code) => (
                  <option key={code} value={code}>
                    {COMMON_LANGUAGE_OPTIONS.find((o) => o.code === code)?.label ?? code}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="editingLanguage">Edit translations for</label>
              <select
                id="editingLanguage"
                value={editingLanguage}
                onChange={(e) => setEditingLanguage(e.target.value)}
              >
                {supportedLanguages
                  .filter((code) => code !== defaultLanguage)
                  .map((code) => (
                    <option key={code} value={code}>
                      {COMMON_LANGUAGE_OPTIONS.find((o) => o.code === code)?.label ?? code}
                    </option>
                  ))}
              </select>
            </div>

            {(missingBannerFields.length > 0 || missingCategoryFields.length > 0) && (
              <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#fffbeb', borderRadius: 8 }}>
                <strong>Missing translations</strong>
                {missingBannerFields.length > 0 && (
                  <p style={{ margin: '0.35rem 0', fontSize: '0.875rem' }}>
                    Banner: {missingBannerFields.join(', ')}
                  </p>
                )}
                {missingCategoryFields.length > 0 && (
                  <p style={{ margin: '0.35rem 0', fontSize: '0.875rem' }}>
                    Categories: {missingCategoryFields.join(', ')}
                  </p>
                )}
              </div>
            )}

            {supportedLanguages.filter((code) => code !== defaultLanguage).length === 0 ? (
              <p style={{ color: 'var(--muted)' }}>Add a language other than the default to edit translations.</p>
            ) : (
              <>
                <div className="field">
                  <label htmlFor="tr-title">
                    Title {missingBannerFields.includes('title') ? '(missing)' : ''}
                  </label>
                  <input
                    id="tr-title"
                    value={editingTranslation?.title ?? ''}
                    onChange={(e) => updateTranslationField(editingLanguage, 'title', e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="tr-description">
                    Description {missingBannerFields.includes('description') ? '(missing)' : ''}
                  </label>
                  <textarea
                    id="tr-description"
                    rows={3}
                    maxLength={2000}
                    value={editingTranslation?.description ?? ''}
                    onChange={(e) => updateTranslationField(editingLanguage, 'description', e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="tr-accept">Accept button</label>
                  <input
                    id="tr-accept"
                    value={editingTranslation?.acceptButton ?? ''}
                    onChange={(e) => updateTranslationField(editingLanguage, 'acceptButton', e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="tr-reject">Reject button</label>
                  <input
                    id="tr-reject"
                    value={editingTranslation?.rejectButton ?? ''}
                    onChange={(e) => updateTranslationField(editingLanguage, 'rejectButton', e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="tr-prefs">Customize button</label>
                  <input
                    id="tr-prefs"
                    value={editingTranslation?.preferencesButton ?? ''}
                    onChange={(e) => updateTranslationField(editingLanguage, 'preferencesButton', e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="tr-save">Save button</label>
                  <input
                    id="tr-save"
                    value={editingTranslation?.saveButton ?? ''}
                    onChange={(e) => updateTranslationField(editingLanguage, 'saveButton', e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="tr-close">Close button</label>
                  <input
                    id="tr-close"
                    value={editingTranslation?.closeButton ?? ''}
                    onChange={(e) => updateTranslationField(editingLanguage, 'closeButton', e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="tr-legal">Legal notice</label>
                  <textarea
                    id="tr-legal"
                    rows={2}
                    value={editingTranslation?.legalNotice ?? ''}
                    onChange={(e) => updateTranslationField(editingLanguage, 'legalNotice', e.target.value)}
                  />
                </div>
                <h4 style={{ marginTop: '1rem' }}>Category translations</h4>
                {categories.map((category) => (
                  <div key={category.id} style={{ marginBottom: '0.75rem' }}>
                    <div className="field">
                      <label htmlFor={`tr-cat-name-${category.slug}`}>
                        {category.name} — name
                        {missingCategoryFields.includes(`${category.slug}:name`) ? ' (missing)' : ''}
                      </label>
                      <input
                        id={`tr-cat-name-${category.slug}`}
                        value={editingTranslation?.categoryNames?.[category.slug] ?? ''}
                        placeholder={category.name}
                        onChange={(e) =>
                          updateTranslationCategoryField(editingLanguage, category.slug, 'name', e.target.value)
                        }
                      />
                    </div>
                    <div className="field">
                      <label htmlFor={`tr-cat-desc-${category.slug}`}>
                        {category.name} — description
                        {missingCategoryFields.includes(`${category.slug}:description`) ? ' (missing)' : ''}
                      </label>
                      <textarea
                        id={`tr-cat-desc-${category.slug}`}
                        rows={2}
                        value={editingTranslation?.categoryDescriptions?.[category.slug] ?? ''}
                        placeholder={category.description ?? ''}
                        onChange={(e) =>
                          updateTranslationCategoryField(
                            editingLanguage,
                            category.slug,
                            'description',
                            e.target.value,
                          )
                        }
                      />
                    </div>
                  </div>
                ))}
              </>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
              <button className="btn" type="button" onClick={saveLanguages}>Save languages</button>
              <button className="btn btn-secondary" type="button" onClick={suggestTranslations}>
                Suggest translations
              </button>
            </div>
            <div className="field" style={{ marginTop: '1rem' }}>
              <label>
                <input type="checkbox" checked={rtlPreview} onChange={(e) => setRtlPreview(e.target.checked)} />
                RTL preview mode
              </label>
            </div>
          </div>

          <div className="card">
            <h3>Translation preview</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
              Previewing {previewLang} ({previewDir.toUpperCase()})
            </p>
            <BannerPreview
              title={previewBannerForLanguage(previewLang).title}
              description={previewBannerForLanguage(previewLang).description}
              contentFormat={previewBannerForLanguage(previewLang).contentFormat}
              acceptButton={previewBannerForLanguage(previewLang).acceptButton}
              rejectButton={previewBannerForLanguage(previewLang).rejectButton}
              preferencesButton={previewBannerForLanguage(previewLang).preferencesButton}
              saveButton={previewBannerForLanguage(previewLang).saveButton}
              layout={previewBannerForLanguage(previewLang).layout}
              theme={previewBannerForLanguage(previewLang).theme}
              viewport="desktop"
              dir={previewDir}
            />
          </div>
        </div>
      )}

      {tab === 'policy' && (
        <div>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3>Google Consent Mode</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
              Configure Consent Mode v2 signals emitted by the CMP before and after visitor choices.
              Load the CMP snippet before GTM or gtag for correct default ordering.
            </p>
            <div className="field">
              <label>
                <input
                  type="checkbox"
                  checked={googleConsentMode.enabled}
                  onChange={(e) => setGoogleConsentMode({ ...googleConsentMode, enabled: e.target.checked })}
                />
                Enable Google Consent Mode
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
                <option value="advanced">Advanced (denied defaults, tags load with limited data)</option>
                <option value="basic">Basic (block tags until consent)</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="gcmWaitForUpdate">Wait for update (ms)</label>
              <input
                id="gcmWaitForUpdate"
                type="number"
                min={0}
                max={5000}
                value={googleConsentMode.waitForUpdate}
                onChange={(e) =>
                  setGoogleConsentMode({
                    ...googleConsentMode,
                    waitForUpdate: Number(e.target.value),
                  })
                }
              />
            </div>
            <div className="field">
              <label>
                <input
                  type="checkbox"
                  checked={googleConsentMode.adsDataRedaction}
                  onChange={(e) =>
                    setGoogleConsentMode({ ...googleConsentMode, adsDataRedaction: e.target.checked })
                  }
                />
                Ads data redaction
              </label>
            </div>
            <div className="field">
              <label>
                <input
                  type="checkbox"
                  checked={googleConsentMode.urlPassthrough}
                  onChange={(e) =>
                    setGoogleConsentMode({ ...googleConsentMode, urlPassthrough: e.target.checked })
                  }
                />
                URL passthrough
              </label>
            </div>
            <button className="btn" type="button" onClick={saveGoogleConsentMode}>
              Save Consent Mode settings
            </button>
            <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginTop: '1rem' }}>
              Publish the policy after saving so live sites receive the updated regulation config.
            </p>
          </div>

          <div className="card">
          <h3>Policy versions</h3>
          <div className="field" style={{ marginTop: '1rem' }}>
            <label htmlFor="scheduleAt">Schedule publish</label>
            <input id="scheduleAt" type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
          </div>
          <button className="btn btn-secondary" type="button" onClick={scheduleDraft}>Schedule current draft</button>
          <table style={{ marginTop: '1.5rem' }}>
            <thead>
              <tr>
                <th>Version</th>
                <th>Status</th>
                <th>Published</th>
                <th>Renewal</th>
              </tr>
            </thead>
            <tbody>
              {policies.map((policy) => (
                <tr key={policy.id}>
                  <td>v{policy.versionNumber}</td>
                  <td>{policy.status}</td>
                  <td>{policy.publishedAt ? new Date(policy.publishedAt).toLocaleString() : '—'}</td>
                  <td>{policy.requiresRenewal ? 'Required' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {tab === 'regional' && (
        <div className="card">
          <h3>Geo targeting &amp; regulation profiles</h3>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
            Regional rules map visitor countries to regulation profiles (GDPR opt-in, CCPA opt-out, etc.).
            Publish the policy after saving. Server geo uses CDN country headers when enabled at organization level.
          </p>
          <div className="field">
            <label>
              <input
                type="checkbox"
                checked={geoSettings.enabled}
                onChange={(e) => setGeoSettings({ ...geoSettings, enabled: e.target.checked })}
              />
              Enable regional rules for this policy
            </label>
          </div>
          <div className="field">
            <label htmlFor="defaultProfileId">Default profile (no rule match)</label>
            <select
              id="defaultProfileId"
              value={geoSettings.defaultProfileId}
              onChange={(e) => setGeoSettings({ ...geoSettings, defaultProfileId: e.target.value })}
            >
              {REGULATION_PROFILE_OPTIONS.map((profile) => (
                <option key={profile.id} value={profile.id}>{profile.name}</option>
              ))}
            </select>
          </div>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => setGeoSettings({ ...geoSettings, regionalRules: DEFAULT_REGIONAL_RULES })}
          >
            Reset to default regional rules
          </button>
          <table style={{ marginTop: '1.5rem' }}>
            <thead>
              <tr>
                <th>Rule</th>
                <th>Conditions</th>
                <th>Profile</th>
                <th>Priority</th>
              </tr>
            </thead>
            <tbody>
              {geoSettings.regionalRules.map((rule) => (
                <tr key={rule.id}>
                  <td>{rule.name}</td>
                  <td>
                    <code>
                      {(rule.conditions.countryGroups ?? rule.conditions.countries ?? []).join(', ') || '—'}
                    </code>
                  </td>
                  <td>{REGULATION_PROFILE_OPTIONS.find((p) => p.id === rule.profileId)?.name ?? rule.profileId}</td>
                  <td>{rule.priority}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="btn" type="button" style={{ marginTop: '1rem' }} onClick={saveGeoSettings}>
            Save regional settings
          </button>
        </div>
      )}

      {tab === 'renewals' && (
        <div className="card">
          <h3>Consent renewal</h3>
          <div className="field">
            <label htmlFor="renewalReason">Reason</label>
            <select id="renewalReason" value={renewalReason} onChange={(e) => setRenewalReason(e.target.value)}>
              <option value="policy_materially_changed">Policy materially changed</option>
              <option value="new_vendor_added">New vendor added</option>
              <option value="new_consent_purpose">New consent purpose</option>
              <option value="consent_expired">Consent expired</option>
              <option value="regulation_changed">Regulation changed</option>
              <option value="admin_requested">Administrator requested</option>
              <option value="consent_before_date">Consent before date</option>
            </select>
          </div>
          <button className="btn" type="button" onClick={triggerRenewal}>Trigger renewal</button>
          <table style={{ marginTop: '1.5rem' }}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Reason</th>
                <th>Scope</th>
              </tr>
            </thead>
            <tbody>
              {renewals.length === 0 ? (
                <tr><td colSpan={3} style={{ color: 'var(--muted)' }}>No renewals yet</td></tr>
              ) : renewals.map((renewal) => (
                <tr key={renewal.id}>
                  <td>{new Date(renewal.createdAt).toLocaleString()}</td>
                  <td>{renewal.reason}</td>
                  <td>{renewal.scope}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ProtectedLayout>
  );
}
