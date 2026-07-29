'use client';

import Link from 'next/link';

const SETUP_ITEMS = [
  {
    id: 'org',
    title: 'Organization profile',
    note: 'Legal name, billing email, timezone.',
    action: { label: 'Settings', href: '/settings' },
  },
  {
    id: 'regulation',
    title: 'Country & regulation',
    note: 'GDPR, CCPA, contacts, DPO.',
    action: { label: 'Settings', href: '/settings' },
  },
  {
    id: 'domain',
    title: 'Add a website',
    note: 'Hostname and domain type required.',
    action: null,
  },
  {
    id: 'verify',
    title: 'Verify domain',
    note: 'Auto-verifies when CMP script loads.',
    action: null,
  },
  {
    id: 'scan',
    title: 'Website scan',
    note: 'Coming in a future release.',
    action: null,
  },
  {
    id: 'banner',
    title: 'Consent banner',
    note: 'Configure categories and banner text.',
    action: { label: 'Admin console', href: null as string | null },
  },
  {
    id: 'install',
    title: 'Install script',
    note: 'Add snippet to your site <head>.',
    action: null,
  },
  {
    id: 'validate',
    title: 'Validate install',
    note: 'Run checks from domain detail page.',
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
    <div className="card setup-guide">
      <div className="card-header">
        <h2>Setup checklist</h2>
        <span className="card-meta">Optional</span>
      </div>
      <p className="setup-guide-intro">
        Complete these when ready. None are required to use the portal.
      </p>
      <ul className="setup-guide-list">
        {SETUP_ITEMS.map((item) => {
          let done = false;
          if (item.id === 'org' || item.id === 'regulation') done = hasOrganization;
          if (item.id === 'domain' || item.id === 'verify') done = hasDomains;

          return (
            <li key={item.id} className={`setup-guide-item ${done ? 'done' : ''}`}>
              <div className="setup-guide-item-header">
                <span className="setup-guide-status" aria-hidden>
                  {done ? '✓' : '○'}
                </span>
                <strong>{item.title}</strong>
              </div>
              <p className="setup-guide-note">{item.note}</p>
              {item.id === 'domain' && !done && (
                <button className="btn-link" type="button" onClick={onAddDomain}>
                  Add website
                </button>
              )}
              {item.id === 'banner' && hasDomains && (
                <Link className="btn-link" href={`${adminUrl}/domains`}>
                  Open admin console
                </Link>
              )}
              {item.action && item.id !== 'banner' && item.id !== 'domain' && (
                <Link className="btn-link" href={item.action.href!}>
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
