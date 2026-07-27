import { describe, expect, it, vi } from 'vitest';
import { buildConsentState, shouldShowBanner } from './types';
import { renderBanner } from './banner-renderer';

const categories = [
  {
    slug: 'strictly_necessary',
    name: 'Strictly Necessary',
    required: true,
    enabled: true,
    defaultState: 'ENABLED',
  },
  {
    slug: 'analytics',
    name: 'Analytics',
    required: false,
    enabled: true,
    defaultState: 'DISABLED',
  },
];

describe('shouldShowBanner', () => {
  it('shows on first visit by default', () => {
    expect(
      shouldShowBanner({
        pathname: '/',
        hasStoredConsent: false,
      }),
    ).toBe(true);
  });

  it('hides when consent exists and renewal not required', () => {
    expect(
      shouldShowBanner({
        pathname: '/',
        hasStoredConsent: true,
        requiresRenewal: false,
      }),
    ).toBe(false);
  });

  it('shows when policy renewal is required', () => {
    expect(
      shouldShowBanner({
        pathname: '/',
        hasStoredConsent: true,
        requiresRenewal: true,
      }),
    ).toBe(true);
  });

  it('respects exclude page rules', () => {
    expect(
      shouldShowBanner({
        pathname: '/admin',
        behavior: { excludePages: ['/admin'] },
        hasStoredConsent: false,
      }),
    ).toBe(false);
  });
});

describe('buildConsentState', () => {
  it('accepts all optional categories', () => {
    expect(buildConsentState(categories, 'accept_all')).toEqual({
      strictly_necessary: true,
      analytics: true,
    });
  });

  it('rejects all optional categories', () => {
    expect(buildConsentState(categories, 'reject_all')).toEqual({
      strictly_necessary: true,
      analytics: false,
    });
  });
});

describe('renderBanner', () => {
  it('renders accessible banner with core actions', () => {
    document.body.innerHTML = '';
    const onConsent = vi.fn();
    const handle = renderBanner(
      {
        domainKey: 'dk_test',
        configVersion: 1,
        categories,
        banner: {
          title: 'Privacy',
          description: 'We use cookies.',
          acceptButton: 'Accept all',
          rejectButton: 'Reject all',
          preferencesButton: 'Customize',
          layout: 'bottom_bar',
        },
      },
      onConsent,
    );
    handle?.show();

    const banner = document.querySelector('[data-cmp-banner]');
    expect(banner).toBeTruthy();
    expect(document.getElementById('cmp-banner-title')?.textContent).toBe('Privacy');
    expect(document.querySelector('[data-cmp-action="accept-all"]')).toBeTruthy();
    expect(document.querySelector('[data-cmp-action="reject-all"]')).toBeTruthy();
    expect(document.querySelector('[data-cmp-action="customize"]')).toBeTruthy();

    (document.querySelector('[data-cmp-action="accept-all"]') as HTMLButtonElement).click();
    expect(onConsent).toHaveBeenCalledWith({ strictly_necessary: true, analytics: true });
    handle?.destroy();
  });

  it('supports customize and save preferences flow', () => {
    document.body.innerHTML = '';
    const onConsent = vi.fn();
    const handle = renderBanner(
      {
        domainKey: 'dk_test',
        configVersion: 1,
        categories,
        banner: {
          title: 'Privacy',
          description: 'We use cookies.',
          acceptButton: 'Accept all',
          rejectButton: 'Reject all',
          preferencesButton: 'Customize',
          saveButton: 'Save preferences',
          layout: 'center_modal',
        },
      },
      onConsent,
    );
    handle?.show();

    (document.querySelector('[data-cmp-action="customize"]') as HTMLButtonElement).click();
    const analyticsToggle = document.getElementById('cmp-cat-analytics') as HTMLInputElement;
    expect(analyticsToggle).toBeTruthy();
    analyticsToggle.checked = true;
    analyticsToggle.dispatchEvent(new Event('change'));

    (document.querySelector('[data-cmp-action="save-preferences"]') as HTMLButtonElement).click();
    expect(onConsent).toHaveBeenCalledWith({ strictly_necessary: true, analytics: true });
    handle?.destroy();
  });

  it('disables save until optional categories are reviewed', () => {
    document.body.innerHTML = '';
    const handle = renderBanner(
      {
        domainKey: 'dk_test',
        configVersion: 1,
        categories,
        banner: {
          title: 'Privacy',
          description: 'We use cookies.',
          acceptButton: 'Accept all',
          rejectButton: 'Reject all',
          preferencesButton: 'Customize',
          saveButton: 'Save preferences',
          layout: 'bottom_bar',
        },
      },
      vi.fn(),
    );
    handle?.show();
    (document.querySelector('[data-cmp-action="customize"]') as HTMLButtonElement).click();
    const save = document.querySelector('[data-cmp-action="save-preferences"]') as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    const analyticsToggle = document.getElementById('cmp-cat-analytics') as HTMLInputElement;
    analyticsToggle.checked = true;
    analyticsToggle.dispatchEvent(new Event('change'));
    expect(save.disabled).toBe(false);
    handle?.destroy();
  });

  it('renders multi-step modal with continue action', () => {
    document.body.innerHTML = '';
    const handle = renderBanner(
      {
        domainKey: 'dk_test',
        configVersion: 1,
        categories,
        banner: {
          title: 'Privacy',
          description: 'We use cookies.',
          acceptButton: 'Accept all',
          rejectButton: 'Reject all',
          preferencesButton: 'Customize',
          layout: 'multi_step_modal',
        },
      },
      vi.fn(),
    );
    handle?.show();
    expect(document.querySelector('[data-cmp-action="continue"]')).toBeTruthy();
    handle?.destroy();
  });
});
