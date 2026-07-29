'use client';

import Link from 'next/link';

const SETUP_ITEMS = [
  {
    id: 'org',
    title: 'Organization profile',
    note: 'Optional: legal name, business type, billing email, timezone, and default language.',
    action: { label: 'Account settings', href: '/settings' },
  },
  {
    id: 'regulation',
    title: 'Country & regulation',
    note: 'Optional: country code, default regulation (GDPR, CCPA, etc.), technical/privacy contacts, and DPO details.',
    action: { label: 'Account settings', href: '/settings' },
  },
  {
    id: 'domain',
    title: 'Add a website',
    note: 'Register the domain where you will run the consent banner. Only hostname and domain type are required.',
    action: null,
  },
  {
    id: 'verify',
    title: 'Verify domain',
    note: 'Domains are verified automatically when the CMP script loads on your site. You can also verify manually from the admin console.',
    action: null,
  },
  {
    id: 'scan',
    title: 'First website scan',
    note: 'Optional: automated cookie/tracker scanning (coming in a future release).',
    action: null,
  },
  {
    id: 'banner',
    title: 'Consent banner setup',
    note: 'Optional: configure consent categories, banner text, and publish a policy version before going live.',
    action: { label: 'Admin console', href: null as string | null },
  },
  {
    id: 'install',
    title: 'Install CMP script',
    note: "Add the installation snippet to your website's <head> after banner configuration.",
    action: null,
  },
  {
    id: 'validate',
    title: 'Validate installation',
    note: 'Optional: run installation checks from the domain detail page in the admin console.',
    action: null,
  },
];

export function SetupGuide({
  hasOrganization,
  hasDomains,
  adminUrl,
  onAddDomain,
}: {
  hasOrganization: boolean;
  hasDomains: boolean;
  adminUrl: string;
  onAddDomain: () => void;
}) {
  return (
    <div className="card setup-guide" style={{ marginTop: '1.5rem' }}>
      <h2 style={{ marginTop: 0, fontSize: '1.125rem' }}>Setup guide</h2>
      <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginTop: 0 }}>
        These steps are <strong>optional</strong> unless noted. Complete them when you are ready — nothing
        blocks access to the dashboard.
      </p>
      <ul className="setup-guide-list">
        {SETUP_ITEMS.map((item) => {
          let done = false;
          if (item.id === 'org' || item.id === 'regulation') done = hasOrganization;
          if (item.id === 'domain' || item.id === 'verify') done = hasDomains;

          return (
            <li key={item.id} className="setup-guide-item">
              <div className="setup-guide-item-header">
                <span className={`setup-guide-status ${done ? 'done' : ''}`} aria-hidden>
                  {done ? '✓' : '○'}
                </span>
                <strong>{item.title}</strong>
                <span className="setup-guide-badge">Optional</span>
              </div>
              <p className="setup-guide-note">{item.note}</p>
              {item.id === 'domain' && (
                <button className="btn btn-secondary" type="button" onClick={onAddDomain} style={{ marginTop: '0.5rem' }}>
                  Add website
                </button>
              )}
              {item.id === 'banner' && hasDomains && (
                <Link className="btn btn-secondary" href={`${adminUrl}/domains`} style={{ marginTop: '0.5rem' }}>
                  Open admin console
                </Link>
              )}
              {item.action && item.id !== 'banner' && item.id !== 'domain' && (
                <Link className="btn btn-secondary" href={item.action.href!} style={{ marginTop: '0.5rem' }}>
                  {item.action.label}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
