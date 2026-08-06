'use client';

import { useEffect, useState } from 'react';
import { WebsiteSidebar } from '@/components/website-sidebar';
import { WebsiteScanProvider } from '@/components/website-scan-context';
import { apiFetch } from '@/lib/api';

export function WebsiteLayout({
  domainId,
  hostname: hostnameProp,
  domainKey: domainKeyProp,
  verificationStatus: verificationStatusProp,
  children,
}: {
  domainId: string;
  hostname?: string;
  domainKey?: string;
  verificationStatus?: string;
  children: React.ReactNode;
}) {
  const [hostname, setHostname] = useState(hostnameProp ?? '');
  const [domainMeta, setDomainMeta] = useState<{
    domainKey: string;
    verificationStatus: string;
  } | null>(null);

  useEffect(() => {
    if (hostnameProp) setHostname(hostnameProp);
  }, [hostnameProp]);

  useEffect(() => {
    apiFetch<{
      hostname: string;
      domainKey: string;
      verificationStatus: string;
    }>(`/domains/${domainId}`, { silent: true }).then((r) => {
      if (!r.data) return;
      if (!hostnameProp) setHostname(r.data.hostname);
      setDomainMeta({
        domainKey: r.data.domainKey,
        verificationStatus: r.data.verificationStatus,
      });
    });
  }, [domainId, hostnameProp]);

  return (
    <WebsiteScanProvider domainId={domainId}>
      <div className="website-layout">
        <WebsiteSidebar
          domainId={domainId}
          hostname={hostname}
          domainKey={domainKeyProp ?? domainMeta?.domainKey}
          verificationStatus={verificationStatusProp ?? domainMeta?.verificationStatus}
        />
        <div className="website-main">{children}</div>
      </div>
    </WebsiteScanProvider>
  );
}
