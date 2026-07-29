export function getWebUrl(): string {
  return (
    process.env.APP_BASE_URL?.replace(/\/$/, '') ||
    process.env.WEB_URL?.replace(/\/$/, '') ||
    process.env.NEXT_PUBLIC_WEB_URL?.replace(/\/$/, '') ||
    'http://localhost:3000'
  );
}

function toAbsoluteAuthUrl(href: string): string {
  if (href.startsWith('http://') || href.startsWith('https://')) {
    return href;
  }

  if (typeof window !== 'undefined') {
    return `${window.location.origin}${href.startsWith('/') ? href : `/${href}`}`;
  }

  const base = getWebUrl();
  return `${base}${href.startsWith('/') ? href : `/${href}`}`;
}

export { toAbsoluteAuthUrl };
