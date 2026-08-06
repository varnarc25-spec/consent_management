'use client';

import { useEffect, useState } from 'react';
import { WebsiteSidebar } from '@/components/website-sidebar';
import type { WebsiteDomainOverviewProps } from '@/components/website-domain-overview';
import { apiFetch } from '@/lib/api';

export type WebsiteOverviewProps = Omit<WebsiteDomainOverviewProps, 'hostname'> & {
  hostname?: string;
};

export function WebsiteLayout({
  domainId,
  hostname: hostnameProp,
  overview: overviewProp,
  children,
}: {
  domainId: string;
  hostname?: string;
  overview?: WebsiteOverviewProps | null;
  children: React.ReactNode;
}) {
  const [hostname, setHostname] = useState(hostnameProp ?? overviewProp?.hostname ?? '');
  const [domainMeta, setDomainMeta] = useState<{
    scanLimit: number;
    scanFrequency: string;
    nextScanAt: string | null;
  } | null>(null);

  useEffect(() => {
    if (hostnameProp) setHostname(hostnameProp);
    else if (overviewProp?.hostname) setHostname(overviewProp.hostname);
  }, [hostnameProp, overviewProp?.hostname]);

  useEffect(() => {
    apiFetch<{
      hostname: string;
      scanLimit: number;
      scanFrequency: string;
      nextScanAt: string | null;
    }>(`/domains/${domainId}`, { silent: true }).then((r) => {
      if (!r.data) return;
      if (!hostnameProp && !overviewProp?.hostname) setHostname(r.data.hostname);
      setDomainMeta({
        scanLimit: r.data.scanLimit,
        scanFrequency: r.data.scanFrequency ?? 'MANUAL',
        nextScanAt: r.data.nextScanAt,
      });
    });
  }, [domainId, hostnameProp, overviewProp?.hostname]);

  const overview: WebsiteDomainOverviewProps | null =
    overviewProp === null
      ? null
      : {
          domainId,
          hostname: hostname || overviewProp?.hostname || '…',
          scanLimit: overviewProp?.scanLimit ?? domainMeta?.scanLimit ?? 10,
          scanFrequency: overviewProp?.scanFrequency ?? domainMeta?.scanFrequency ?? 'MANUAL',
          nextScanAt: overviewProp?.nextScanAt ?? domainMeta?.nextScanAt ?? null,
          onFrequencyChange: overviewProp?.onFrequencyChange,
        };

  return (
    <div className="website-layout">
      <WebsiteSidebar domainId={domainId} hostname={hostname} overview={overview} />
      <div className="website-main">{children}</div>
    </div>
  );
}
