'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';

interface ScanSummary {
  status: string;
}

interface PolicySummary {
  status: string;
}

interface ValidationHistoryItem {
  overallStatus: string;
}

export interface WebsiteSetupStepsProps {
  domainId: string;
  hostname: string;
  verificationStatus: string;
  sdkLastSeenAt?: string | null;
  compact?: boolean;
}

const STEPS = [
  { id: 'register', label: 'Add website', note: 'Hostname and domain type' },
  { id: 'verify', label: 'Verify domain', note: 'CMP script on your site' },
  { id: 'scan', label: 'Website scan', note: 'Detect cookies and trackers' },
  { id: 'consent', label: 'Consent banner', note: 'Categories and banner text' },
  { id: 'install', label: 'Install script', note: 'Snippet in site head' },
  { id: 'validate', label: 'Validate install', note: 'Confirm live setup' },
] as const;

function stepHref(domainId: string, stepId: string): string | null {
  switch (stepId) {
    case 'register':
      return '/dashboard';
    case 'verify':
    case 'install':
    case 'validate':
      return `/websites/${domainId}#setup-${stepId}`;
    case 'scan':
      return `/websites/${domainId}/scans`;
    case 'consent':
      return `/websites/${domainId}/consent`;
    default:
      return null;
  }
}

export function WebsiteSetupSteps({
  domainId,
  hostname,
  verificationStatus,
  sdkLastSeenAt,
  compact = false,
}: WebsiteSetupStepsProps) {
  const [scanDone, setScanDone] = useState(false);
  const [consentDone, setConsentDone] = useState(false);
  const [validateDone, setValidateDone] = useState(false);

  useEffect(() => {
    apiFetch<ScanSummary[]>(`/domains/${domainId}/scans`).then((r) => {
      if (r.data) setScanDone(r.data.some((s) => s.status === 'COMPLETED'));
    });
    apiFetch<PolicySummary[]>(`/domains/${domainId}/consent/policies`).then((r) => {
      if (r.data) setConsentDone(r.data.some((p) => p.status === 'PUBLISHED'));
    });
    apiFetch<ValidationHistoryItem[]>(`/domains/${domainId}/validation-history`).then((r) => {
      if (r.data) setValidateDone(r.data.some((v) => v.overallStatus === 'PASS'));
    });
  }, [domainId]);

  const stepDone = useMemo(() => {
    const verified = verificationStatus === 'VERIFIED';
    const installed = Boolean(sdkLastSeenAt);
    return {
      register: true,
      verify: verified,
      scan: scanDone,
      consent: consentDone,
      install: installed,
      validate: validateDone,
    };
  }, [verificationStatus, sdkLastSeenAt, scanDone, consentDone, validateDone]);

  const completedCount = STEPS.filter((s) => stepDone[s.id]).length;
  const allDone = completedCount === STEPS.length;

  return (
    <div className={`website-setup ${compact ? 'website-setup-compact' : ''}`}>
      <div className="website-setup-header">
        <div>
          <h2>{compact ? 'Setup progress' : 'Website setup'}</h2>
          <p className="website-setup-intro">
            {allDone
              ? `${hostname} is fully configured.`
              : `Complete each step for ${hostname}. All steps are required before go-live.`}
          </p>
        </div>
        <span className="website-setup-progress-badge" aria-label={`${completedCount} of ${STEPS.length} steps complete`}>
          {completedCount}/{STEPS.length}
        </span>
      </div>

      <ol className="website-setup-track" aria-label="Website setup steps">
        {STEPS.map((step, index) => {
          const done = stepDone[step.id];
          const href = stepHref(domainId, step.id);
          const isCurrent =
            !done &&
            STEPS.slice(0, index).every((s) => stepDone[s.id]) &&
            !STEPS.slice(0, index + 1).every((s) => stepDone[s.id]);

          return (
            <li
              key={step.id}
              id={`setup-${step.id}`}
              className={`website-setup-step ${done ? 'done' : ''} ${isCurrent ? 'current' : ''}`}
            >
              <div className="website-setup-step-marker" aria-hidden>
                {done ? '✓' : index + 1}
              </div>
              <div className="website-setup-step-body">
                <strong>{step.label}</strong>
                {!compact && <span className="website-setup-step-note">{step.note}</span>}
                {!done && href && (
                  <Link className="btn-link website-setup-step-action" href={href}>
                    {step.id === 'scan' ? 'Run scan' : step.id === 'consent' ? 'Configure consent' : 'Continue'}
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function websiteSetupProgress(
  verificationStatus: string,
  sdkLastSeenAt?: string | null,
): { completed: number; total: number } {
  let completed = 1;
  if (verificationStatus === 'VERIFIED') completed += 1;
  if (sdkLastSeenAt) completed += 1;
  return { completed, total: STEPS.length };
}
