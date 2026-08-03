'use client';

import { GlobalLoadingOverlay } from '@/components/global-loading-overlay';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <GlobalLoadingOverlay />
    </>
  );
}
