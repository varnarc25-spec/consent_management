'use client';

import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from 'react';
import { toAbsoluteAuthUrl } from '@/lib/web-url';

/** Full-page navigation for Auth0 routes — App Router soft navigation cannot reach middleware-only auth paths. */
export function AuthNavLink({
  href,
  className,
  style,
  children,
}: {
  href: string;
  className?: string;
  style?: AnchorHTMLAttributes<HTMLAnchorElement>['style'];
  children: ReactNode;
}) {
  const targetUrl = toAbsoluteAuthUrl(href);

  function navigate(event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    window.location.href = targetUrl;
  }

  return (
    <a
      href={targetUrl}
      className={className}
      style={style}
      onClickCapture={navigate}
    >
      {children}
    </a>
  );
}
