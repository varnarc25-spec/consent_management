import type { Metadata } from 'next';
import { getRuntimePublicEnvScript } from '@/lib/runtime-public-env';
import './globals.css';

export const metadata: Metadata = {
  title: 'CMP — Consent Management Platform',
  description: 'Enterprise consent management for cookies, trackers, and privacy compliance.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const envScript = getRuntimePublicEnvScript();

  return (
    <html lang="en">
      <head>
        {envScript ? (
          <script dangerouslySetInnerHTML={{ __html: envScript }} />
        ) : null}
      </head>
      <body>{children}</body>
    </html>
  );
}
