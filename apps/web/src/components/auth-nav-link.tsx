'use client';

import type { AnchorHTMLAttributes, ReactNode } from 'react';

/** Full-page navigation for Auth0 routes — Next.js client routing cannot follow middleware redirects to Auth0. */
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
  return (
    <a
      href={href}
      className={className}
      style={style}
      onClick={(event) => {
        event.preventDefault();
        window.location.assign(href);
      }}
    >
      {children}
    </a>
  );
}
