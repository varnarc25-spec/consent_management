'use client';

import { useEffect, useState } from 'react';
import { WebsiteSidebar } from '@/components/website-sidebar';
import { apiFetch } from '@/lib/api';

export function WebsiteLayout({
  domainId,
  hostname: hostnameProp,
  children,
}: {
  domainId: string;
  hostname?: string;
  children: React.ReactNode;
}) {
  const [hostname, setHostname] = useState(hostnameProp ?? '');

  useEffect(() => {
    if (hostnameProp) {
      setHostname(hostnameProp);
      return;
    }
    apiFetch<{ hostname: string }>(`/domains/${domainId}`, { silent: true }).then((r) => {
      if (r.data?.hostname) setHostname(r.data.hostname);
    });
  }, [domainId, hostnameProp]);

  return (
    <div className="website-layout">
      <WebsiteSidebar domainId={domainId} hostname={hostname} />
      <div className="website-main">{children}</div>
    </div>
  );
}
