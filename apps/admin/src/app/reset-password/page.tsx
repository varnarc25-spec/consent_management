'use client';

import { Suspense } from 'react';
import { LoadingScreen } from '@/components/loading-screen';
import ResetPasswordForm from './reset-password-form';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
