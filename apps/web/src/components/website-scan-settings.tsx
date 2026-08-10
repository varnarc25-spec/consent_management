'use client';

import { useState } from 'react';
import { useWebsiteScan } from '@/components/website-scan-context';
import { apiFetch, ensureApiSession } from '@/lib/api';

interface ScanSummary {
  id: string;
  status: string;
}

export function WebsiteScanSettings({
  domainId,
  hostname,
  scanFrequency,
  onFrequencyChange,
}: {
  domainId: string;
  hostname: string;
  scanFrequency: string;
  onFrequencyChange?: (frequency: string) => void;
}) {
  const websiteScan = useWebsiteScan();
  const hasRunningScan = websiteScan?.hasRunningScan ?? false;
  const [startingScan, setStartingScan] = useState(false);

  async function startScan() {
    setStartingScan(true);
    websiteScan?.clearFlash();
    const sessionOk = await ensureApiSession();
    if (!sessionOk) {
      setStartingScan(false);
      return;
    }
    const result = await apiFetch<ScanSummary>(`/domains/${domainId}/scans`, {
      method: 'POST',
      body: JSON.stringify({
        startUrl: `https://${hostname}/`,
        maxPages: 1,
        maxDepth: 0,
        timeoutMs: 20000,
        jsRendering: true,
        deviceType: 'desktop',
      }),
    });
    setStartingScan(false);
    if (result.ok) {
      websiteScan?.notifyScanStarted();
    }
  }

  return (
    <section className="website-domain-section website-scan-settings-section">
      <h3>Scan settings</h3>
      <p className="website-section-muted">
        Save website settings after changing frequency. Homepage scans use one page with full
        consent probing.
      </p>
      <div className="field">
        <label htmlFor="webScanFrequency">Scan frequency</label>
        <select
          id="webScanFrequency"
          value={scanFrequency}
          onChange={(e) => onFrequencyChange?.(e.target.value)}
        >
          <option value="MANUAL">Manual</option>
          <option value="DAILY">Daily</option>
          <option value="WEEKLY">Weekly</option>
          <option value="MONTHLY">Monthly</option>
        </select>
      </div>
      <div className="domain-scan-now-inline">
        <p className="domain-scan-now-label">Scan homepage now</p>
        <p className="website-section-muted" style={{ marginBottom: '0.75rem' }}>
          Usually under a minute.
        </p>
        <button
          className="btn"
          type="button"
          disabled={startingScan || hasRunningScan}
          onClick={startScan}
        >
          {startingScan ? 'Starting…' : hasRunningScan ? 'Scan running…' : 'Scan homepage'}
        </button>
      </div>
    </section>
  );
}
