'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ProtectedLayout } from '@/components/protected-layout';
import { WebsiteLayout } from '@/components/website-layout';
import { WebsiteScanStatus } from '@/components/website-scan-context';
import { WebsiteScanSettings } from '@/components/website-scan-settings';
import { apiFetch } from '@/lib/api';

interface Domain {
  id: string;
  hostname: string;
  enabled: boolean;
  groupName: string | null;
  scanLimit: number;
  scanFrequency: string;
  autoBlocking: boolean;
  debugMode: boolean;
  nextScanAt: string | null;
}

export default function AdvancedSettingsPage() {
  const params = useParams();
  const domainId = params.id as string;
  const [domain, setDomain] = useState<Domain | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [settings, setSettings] = useState({
    enabled: true,
    groupName: '',
    scanLimit: 10,
    scanFrequency: 'MANUAL',
    autoBlocking: true,
    debugMode: false,
  });

  useEffect(() => {
    apiFetch<Domain>(`/domains/${domainId}`).then((r) => {
      if (r.data) {
        setDomain(r.data);
        setSettings({
          enabled: r.data.enabled,
          groupName: r.data.groupName ?? '',
          scanLimit: r.data.scanLimit,
          scanFrequency: r.data.scanFrequency ?? 'MANUAL',
          autoBlocking: r.data.autoBlocking,
          debugMode: r.data.debugMode,
        });
      }
    });
  }, [domainId]);

  async function saveSettings(e: FormEvent) {
    e.preventDefault();
    setMessage('');
    setError('');
    const result = await apiFetch<Domain>(`/domains/${domainId}`, {
      method: 'PATCH',
      body: JSON.stringify(settings),
    });
    if (result.ok && result.data) {
      setDomain(result.data);
      setMessage('Settings saved');
    } else {
      setError(result.error?.message ?? 'Failed to save');
    }
  }

  return (
    <ProtectedLayout>
      <WebsiteLayout domainId={domainId} hostname={domain?.hostname}>
        <div className="website-page-header website-page-header-end">
          <WebsiteScanStatus />
        </div>
        {message && <p className="success">{message}</p>}
        {error && <p className="error">{error}</p>}
        <div className="card" style={{ padding: '1.25rem' }}>
          <h2 style={{ marginTop: 0 }}>Advanced Settings</h2>
          <form onSubmit={saveSettings}>
            <div className="field">
              <label htmlFor="enabled">Status</label>
              <select
                id="enabled"
                value={settings.enabled ? 'true' : 'false'}
                onChange={(e) => setSettings({ ...settings, enabled: e.target.value === 'true' })}
              >
                <option value="true">Enabled</option>
                <option value="false">Disabled</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="groupName">Domain group</label>
              <input
                id="groupName"
                value={settings.groupName}
                onChange={(e) => setSettings({ ...settings, groupName: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="scanLimit">Scan page limit</label>
              <input
                id="scanLimit"
                type="number"
                min={1}
                max={1000}
                value={settings.scanLimit}
                onChange={(e) => setSettings({ ...settings, scanLimit: Number(e.target.value) })}
              />
            </div>
            <div className="field">
              <label htmlFor="autoBlocking">Auto-blocking</label>
              <select
                id="autoBlocking"
                value={settings.autoBlocking ? 'true' : 'false'}
                onChange={(e) =>
                  setSettings({ ...settings, autoBlocking: e.target.value === 'true' })
                }
              >
                <option value="true">Enabled</option>
                <option value="false">Disabled</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="debugMode">Debug mode</label>
              <select
                id="debugMode"
                value={settings.debugMode ? 'true' : 'false'}
                onChange={(e) => setSettings({ ...settings, debugMode: e.target.value === 'true' })}
              >
                <option value="true">Enabled</option>
                <option value="false">Disabled</option>
              </select>
            </div>
            <button className="btn" type="submit">
              Save settings
            </button>
          </form>
          {domain && (
            <div style={{ marginTop: '1.5rem' }}>
              <WebsiteScanSettings
                domainId={domain.id}
                hostname={domain.hostname}
                scanFrequency={settings.scanFrequency}
                onFrequencyChange={(f) => setSettings((s) => ({ ...s, scanFrequency: f }))}
              />
            </div>
          )}
        </div>
      </WebsiteLayout>
    </ProtectedLayout>
  );
}
