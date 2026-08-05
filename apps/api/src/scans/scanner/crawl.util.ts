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

/** Merge anchor hrefs from live DOM with regex extraction from HTML. */
export function mergeDiscoveredLinks(
  html: string,
  anchorHrefs: string[],
  pageUrl: string,
  siteHostname: string,
): string[] {
  const merged = new Set<string>();
  for (const link of extractLinks(html, pageUrl, siteHostname)) {
    merged.add(link);
  }
  for (const href of anchorHrefs) {
    if (
      !href ||
      href.startsWith('javascript:') ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:')
    ) {
      continue;
    }
    const normalized = normalizeUrl(href, pageUrl);
    if (normalized && isSameSite(normalized, siteHostname)) {
      merged.add(normalized);
    }
  }
  return [...merged];
}

function parseSitemapLocs(xml: string): string[] {
  const locs: string[] = [];
  const locRegex = /<loc>\s*([^<]+?)\s*<\/loc>/gi;
  let match: RegExpExecArray | null;
  while ((match = locRegex.exec(xml)) !== null) {
    const loc = match[1]?.trim();
    if (loc) locs.push(loc);
  }
  return locs;
}

async function fetchText(url: string, timeoutMs = 15000): Promise<string | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { 'User-Agent': 'CMP-Website-Scanner/1.0', Accept: 'text/xml,text/plain,*/*' },
      redirect: 'follow',
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

async function collectSitemapUrls(
  sitemapUrl: string,
  siteHostname: string,
  collected: Set<string>,
  visitedSitemaps: Set<string>,
) {
  const normalizedSitemap = normalizeUrl(sitemapUrl);
  if (!normalizedSitemap || visitedSitemaps.has(normalizedSitemap)) return;
  visitedSitemaps.add(normalizedSitemap);

  const xml = await fetchText(normalizedSitemap);
  if (!xml) return;

  for (const loc of parseSitemapLocs(xml)) {
    if (/\.xml$/i.test(loc) && /sitemap/i.test(loc)) {
      await collectSitemapUrls(loc, siteHostname, collected, visitedSitemaps);
      continue;
    }
    const pageUrl = normalizeUrl(loc);
    if (pageUrl && isSameSite(pageUrl, siteHostname)) {
      collected.add(pageUrl);
    }
  }
}

/** Discover crawl targets from robots.txt and sitemap.xml (Cookiebot-style URL inventory). */
export async function discoverSitemapUrls(startUrl: string, siteHostname: string): Promise<string[]> {
  const origin = new URL(startUrl).origin;
  const collected = new Set<string>();
  const visitedSitemaps = new Set<string>();
  const sitemapCandidates = new Set<string>();

  const robots = await fetchText(`${origin}/robots.txt`, 10000);
  if (robots) {
    for (const line of robots.split('\n')) {
      const match = line.match(/^\s*sitemap:\s*(.+)\s*$/i);
      if (match?.[1]) sitemapCandidates.add(match[1].trim());
    }
  }

  sitemapCandidates.add(`${origin}/sitemap.xml`);
  sitemapCandidates.add(`${origin}/sitemap_index.xml`);

  for (const candidate of sitemapCandidates) {
    await collectSitemapUrls(candidate, siteHostname, collected, visitedSitemaps);
  }

  return [...collected];
}

export function enqueueDiscoveredLinks(
  links: string[],
  depth: number,
  seen: Set<string>,
  queue: Array<{ url: string; depth: number }>,
  includePaths?: string[],
  excludePaths?: string[],
) {
  for (const link of links) {
    if (seen.has(link)) continue;
    const pathName = new URL(link).pathname;
    if (!matchesPathRules(pathName, includePaths, excludePaths)) continue;
    queue.push({ url: link, depth });
  }
}

export function buildStartUrl(hostname: string, startUrl?: string) {
  if (startUrl) return startUrl;
  return `https://${hostname}/`;
}
