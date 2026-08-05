import type { DomainScan } from '@cmp/database';
import type { ScanFindingInput } from '@cmp/database';
import type { Browser, BrowserContext, Page } from 'playwright';
import {
  cookiesToFindings,
  countFindingStats,
  dedupeFindings,
  domSnapshotToFindings,
} from './capture.util';
import {
  discoverLinksFromFetchPage,
  discoverSitemapUrls,
  enqueueDiscoveredLinks,
  getHostname,
  isSameSite,
  matchesPathRules,
  mergeDiscoveredLinks,
  normalizeUrl,
  SCANNER_USER_AGENT,
} from './crawl.util';
import { isTrackingPixelUrl } from './tracker-patterns';

export interface ScanRunResult {
  pagesScanned: number;
  cookiesFound: number;
  trackersFound: number;
  findings: ScanFindingInput[];
  pageRecords: Array<{
    url: string;
    canonicalUrl?: string | null;
    status: string;
    depth: number;
    errorMessage?: string | null;
    findings: ScanFindingInput[];
  }>;
}

async function loadPlaywright() {
  if (!process.env.PLAYWRIGHT_BROWSERS_PATH && process.env.NODE_ENV === 'production') {
    process.env.PLAYWRIGHT_BROWSERS_PATH = '/ms-playwright';
  }
  try {
    return await import('playwright');
  } catch {
    throw new Error(
      'Playwright is not installed. Local dev: pnpm --filter @cmp/api playwright:install. Cloud Run: redeploy API image with Playwright browsers.',
    );
  }
}

async function captureDomSnapshot(page: Page, networkUrls: string[]) {
  return page.evaluate(async (urls) => {
    const scripts = Array.from(document.querySelectorAll('script')).map((script) => ({
      src: script.src || '',
      inline: !script.src && Boolean(script.textContent?.trim()),
    }));
    const iframes = Array.from(document.querySelectorAll('iframe'))
      .map((iframe) => iframe.src)
      .filter(Boolean);
    const pixels = Array.from(document.querySelectorAll('img'))
      .filter((img) => {
        const src = img.currentSrc || img.src;
        return src && (img.width <= 2 || img.height <= 2 || /track|pixel|tr\?/i.test(src));
      })
      .map((img) => img.currentSrc || img.src);

    const localStorage: Array<{ key: string; value: string }> = [];
    try {
      for (let i = 0; i < window.localStorage.length; i += 1) {
        const key = window.localStorage.key(i);
        if (!key) continue;
        localStorage.push({ key, value: window.localStorage.getItem(key) ?? '' });
      }
    } catch {
      /* ignore */
    }

    const sessionStorage: Array<{ key: string; value: string }> = [];
    try {
      for (let i = 0; i < window.sessionStorage.length; i += 1) {
        const key = window.sessionStorage.key(i);
        if (!key) continue;
        sessionStorage.push({ key, value: window.sessionStorage.getItem(key) ?? '' });
      }
    } catch {
      /* ignore */
    }

    let indexedDbNames: string[] = [];
    try {
      if ('indexedDB' in window && typeof indexedDB.databases === 'function') {
        const databases = await indexedDB.databases();
        indexedDbNames = databases.map((db) => db.name).filter(Boolean) as string[];
      }
    } catch {
      /* ignore */
    }

    const serviceWorkerUrls: string[] = [];
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          if (registration.active?.scriptURL) serviceWorkerUrls.push(registration.active.scriptURL);
        }
      }
    } catch {
      /* ignore */
    }

    return {
      scripts,
      iframes,
      pixels,
      localStorage,
      sessionStorage,
      indexedDbNames,
      serviceWorkerUrls,
      networkUrls: urls,
    };
  }, networkUrls);
}

async function navigateForScan(
  page: Page,
  url: string,
  jsRendering: boolean,
  timeoutMs: number,
) {
  await page.goto(url, {
    waitUntil: jsRendering ? 'load' : 'domcontentloaded',
    timeout: timeoutMs,
  });
  if (jsRendering) {
    await page.waitForTimeout(1500);
  }
}

async function extractAnchorHrefs(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('a[href]'))
      .map((anchor) => anchor.getAttribute('href') ?? '')
      .filter(Boolean),
  );
}

async function clickCmpAction(page: Page, action: string) {
  const selector = `[data-cmp-action="${action}"]`;
  const button = page.locator(selector).first();
  if (await button.count() === 0) return false;
  try {
    await button.click({ timeout: 3000 });
    await page.waitForTimeout(800);
    return true;
  } catch {
    return false;
  }
}

async function scanPageState(
  page: Page,
  context: BrowserContext,
  consentState: 'BEFORE_CONSENT' | 'AFTER_ACCEPT' | 'AFTER_REJECT',
  pageUrl: string,
  pageId: string | null,
  siteHostname: string,
  networkUrls: string[],
): Promise<ScanFindingInput[]> {
  const cookies = await context.cookies();
  const cookieFindings = cookiesToFindings(
    cookies.map((cookie) => ({
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      expires: cookie.expires,
      secure: cookie.secure,
      httpOnly: cookie.httpOnly,
      sameSite: cookie.sameSite,
    })),
    consentState,
    pageUrl,
    pageId,
    siteHostname,
  );

  const snapshot = await captureDomSnapshot(page, networkUrls);
  const domFindings = domSnapshotToFindings(snapshot, consentState, pageUrl, pageId, siteHostname);

  return [...cookieFindings, ...domFindings];
}

export async function runWebsiteScan(scan: DomainScan): Promise<ScanRunResult> {
  const playwright = await loadPlaywright();
  const includePaths = (scan.includePaths as string[] | null) ?? undefined;
  const excludePaths = (scan.excludePaths as string[] | null) ?? undefined;
  const siteHostname = getHostname(scan.startUrl);
  if (!siteHostname) {
    throw new Error('Invalid start URL hostname');
  }

  const browser: Browser = await playwright.chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
  });
  const contextOptions =
    scan.deviceType === 'mobile'
      ? playwright.devices['Pixel 7']
      : { viewport: { width: 1366, height: 900 } };
  const context: BrowserContext = await browser.newContext({
    ...contextOptions,
    userAgent: SCANNER_USER_AGENT,
    locale: 'en-US',
    extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' },
  });
  const page = await context.newPage();

  const queue: Array<{ url: string; depth: number }> = [{ url: scan.startUrl, depth: 0 }];
  const seen = new Set<string>();
  const allFindings: ScanFindingInput[] = [];
  const pageRecords: ScanRunResult['pageRecords'] = [];
  let pagesScanned = 0;

  const homeLinks = await discoverLinksFromFetchPage(scan.startUrl, siteHostname);
  enqueueDiscoveredLinks(homeLinks, 1, seen, queue, includePaths, excludePaths);

  const sitemapUrls = await discoverSitemapUrls(scan.startUrl, siteHostname);
  enqueueDiscoveredLinks(
    sitemapUrls,
    1,
    seen,
    queue,
    includePaths,
    excludePaths,
  );

  const startNormalized = normalizeUrl(scan.startUrl);

  try {
    while (queue.length > 0 && pagesScanned < scan.maxPages) {
      const current = queue.shift()!;
      const normalized = normalizeUrl(current.url);
      if (!normalized || seen.has(normalized)) continue;

      const pathName = new URL(normalized).pathname;
      if (!matchesPathRules(pathName, includePaths, excludePaths)) continue;

      seen.add(normalized);
      const networkUrls: string[] = [];
      const onRequest = (request: { url: () => string }) => {
        const url = request.url();
        if (
          isTrackingPixelUrl(url) ||
          url.includes('googletagmanager') ||
          url.includes('analytics')
        ) {
          networkUrls.push(url);
        }
      };
      page.on('request', onRequest);

      let pageStatus = 'ok';
      let errorMessage: string | null = null;
      const pageFindings: ScanFindingInput[] = [];
      let discoveredLinks: string[] = [];

      try {
        await navigateForScan(page, normalized, scan.jsRendering, scan.timeoutMs);

        const pageIdPlaceholder = null;
        const html = await page.content();
        const anchorHrefs = await extractAnchorHrefs(page);
        if (current.depth < scan.maxDepth) {
          discoveredLinks = mergeDiscoveredLinks(html, anchorHrefs, normalized, siteHostname);
        }

        const runFullConsentProbe =
          startNormalized !== null && normalized === startNormalized;

        pageFindings.push(
          ...(await scanPageState(
            page,
            context,
            'BEFORE_CONSENT',
            normalized,
            pageIdPlaceholder,
            siteHostname,
            networkUrls,
          )),
        );

        if (runFullConsentProbe) {
          const accepted = await clickCmpAction(page, 'accept-all');
          if (accepted) {
            pageFindings.push(
              ...(await scanPageState(
                page,
                context,
                'AFTER_ACCEPT',
                normalized,
                pageIdPlaceholder,
                siteHostname,
                networkUrls,
              )),
            );
          }

          try {
            await navigateForScan(page, normalized, scan.jsRendering, scan.timeoutMs);
            const rejected = await clickCmpAction(page, 'reject-all');
            if (rejected) {
              pageFindings.push(
                ...(await scanPageState(
                  page,
                  context,
                  'AFTER_REJECT',
                  normalized,
                  pageIdPlaceholder,
                  siteHostname,
                  networkUrls,
                )),
              );
            }
          } catch (rejectError) {
            if (!errorMessage) {
              errorMessage =
                rejectError instanceof Error
                  ? `Reject capture failed: ${rejectError.message}`
                  : 'Reject capture failed';
            }
          }
        }
      } catch (error) {
        pageStatus = 'failed';
        errorMessage = error instanceof Error ? error.message : 'Page scan failed';
      } finally {
        if (discoveredLinks.length > 0) {
          enqueueDiscoveredLinks(
            discoveredLinks,
            current.depth + 1,
            seen,
            queue,
            includePaths,
            excludePaths,
          );
        }
        page.off('request', onRequest);
      }

      pagesScanned += 1;
      pageRecords.push({
        url: normalized,
        canonicalUrl: normalized,
        status: pageStatus,
        depth: current.depth,
        errorMessage,
        findings: dedupeFindings(pageFindings),
      });
      allFindings.push(...pageFindings);
    }
  } finally {
    await browser.close();
  }

  const deduped = dedupeFindings(allFindings);
  const stats = countFindingStats(deduped);

  return {
    pagesScanned,
    cookiesFound: stats.cookies,
    trackersFound: stats.trackers,
    findings: deduped,
    pageRecords,
  };
}
