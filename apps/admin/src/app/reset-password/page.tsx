'use client';

import { Suspense } from 'react';
import ResetPasswordForm from './reset-password-form';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="container"><p>Loading...</p></div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
