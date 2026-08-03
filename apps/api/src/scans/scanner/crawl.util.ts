export function normalizeUrl(url: string, base?: string): string | null {
  try {
    const parsed = new URL(url, base);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    parsed.hash = '';
    let pathname = parsed.pathname.replace(/\/+$/, '') || '/';
    parsed.pathname = pathname;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function getHostname(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

export function isSameSite(url: string, siteHostname: string) {
  const host = getHostname(url);
  if (!host) return false;
  const site = siteHostname.toLowerCase().replace(/^www\./, '');
  return host === site || host.endsWith(`.${site}`);
}

export function matchesPathRules(pathname: string, includePaths?: string[], excludePaths?: string[]) {
  const path = pathname.replace(/\/$/, '') || '/';
  if (excludePaths?.length) {
    for (const pattern of excludePaths) {
      if (matchPathPattern(path, pattern)) return false;
    }
  }
  if (includePaths?.length) {
    return includePaths.some((pattern) => matchPathPattern(path, pattern));
  }
  return true;
}

function matchPathPattern(path: string, pattern: string) {
  const normalized = pattern.startsWith('/') ? pattern : `/${pattern}`;
  if (normalized.endsWith('*')) {
    return path.startsWith(normalized.slice(0, -1));
  }
  return path === normalized || path.startsWith(`${normalized}/`);
}

export function extractLinks(html: string, pageUrl: string, siteHostname: string): string[] {
  const links: string[] = [];
  const hrefRegex = /href=["']([^"'#]+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = hrefRegex.exec(html)) !== null) {
    const href = match[1]?.trim();
    if (!href || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
      continue;
    }
    const normalized = normalizeUrl(href, pageUrl);
    if (!normalized || !isSameSite(normalized, siteHostname)) continue;
    links.push(normalized);
  }
  return links;
}

export function buildStartUrl(hostname: string, startUrl?: string) {
  if (startUrl) return startUrl;
  return `https://${hostname}/`;
}
