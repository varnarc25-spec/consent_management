import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CMP — Consent Management Platform',
  description: 'Enterprise consent management for cookies, trackers, and privacy compliance.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
