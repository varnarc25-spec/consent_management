import type { Metadata } from 'next';
import { getRuntimePublicEnvScript } from '@/lib/runtime-public-env';
import { AppProviders } from '@/components/app-providers';
import './globals.css';

export const dynamic = 'force-dynamic';

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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
