import type { AnchorHTMLAttributes, ReactNode } from 'react';

/** Full-page navigation for Auth0 routes (avoids Next.js prefetch CORS on /auth/login). */
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
    <a href={href} className={className} style={style}>
      {children}
    </a>
  );
}
