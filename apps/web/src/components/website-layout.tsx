'use client';

import { useEffect, useState } from 'react';
import { WebsiteChrome } from '@/components/website-chrome';
import { WebsiteScanProvider } from '@/components/website-scan-context';
import { apiFetch } from '@/lib/api';

export function WebsiteLayout({
  domainId,
  hostname: hostnameProp,
  domainKey: _domainKeyProp,
  verificationStatus: _verificationStatusProp,
  children,
}: {
  domainId: string;
  hostname?: string;
  domainKey?: string;
  verificationStatus?: string;
  children: React.ReactNode;
}) {
  const [hostname, setHostname] = useState(hostnameProp ?? '');

  useEffect(() => {
    if (hostnameProp) setHostname(hostnameProp);
  }, [hostnameProp]);

  useEffect(() => {
    if (hostnameProp) return;
    apiFetch<{ hostname: string }>(`/domains/${domainId}`, { silent: true }).then((r) => {
      if (r.data) setHostname(r.data.hostname);
    });
  }, [domainId, hostnameProp]);

  return (
    <WebsiteScanProvider domainId={domainId}>
      <WebsiteChrome domainId={domainId} hostname={hostname}>
        {children}
      </WebsiteChrome>
    </WebsiteScanProvider>
  );
}
