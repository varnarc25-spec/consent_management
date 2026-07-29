'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { hasPermission } from '@cmp/auth';
import type { CurrentUser } from '@cmp/types';
import type { Permission } from '@cmp/auth';

export function useRequirePermission(user: CurrentUser | null, permission: Permission) {
  const router = useRouter();

  useEffect(() => {
    if (!user) return;
    if (!hasPermission(user.permissions, permission)) {
      router.replace('/domains');
    }
  }, [user, permission, router]);
}

export function PermissionGate({
  user,
  permission,
  children,
  fallback = null,
}: {
  user: CurrentUser;
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  if (!hasPermission(user.permissions, permission)) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}
