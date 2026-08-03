'use client';

import { useEffect, useState } from 'react';
import { isLoading, subscribeLoading } from '@/lib/loading-store';
import { LoadingSpinner } from '@/components/loading-spinner';

export function GlobalLoadingOverlay() {
  const [visible, setVisible] = useState(isLoading());

  useEffect(() => {
    return subscribeLoading(() => setVisible(isLoading()));
  }, []);

  if (!visible) return null;

  return (
    <div className="global-loading-overlay" role="status" aria-live="polite" aria-label="Loading">
      <LoadingSpinner size="lg" />
    </div>
  );
}
