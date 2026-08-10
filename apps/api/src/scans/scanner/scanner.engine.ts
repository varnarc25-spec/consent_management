import type { DomainScan } from '@cmp/database';
import type { ScanFindingInput } from '@cmp/database';
import type { Browser, BrowserContext, Page } from 'playwright';
import {
  cookiesToFindings,
  countFindingStats,
  dedupeFindings,
  domSnapshotToFindings,
  frameStorageToFindings,
  type FrameStorageSnapshot,
} from './capture.util';
import {
  discoverLinksFromFetchPage,
  discoverSitemapUrls,
  enqueueDiscoveredLinks,
  getHostname,
  CHROMIUM_LAUNCH_ARGS,
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

export interface ScanProgressUpdate {
  pagesScanned: number;
  cookiesFound: number;
  trackersFound: number;
}

export type ScanPageProgressHandler = (
  pageRecord: ScanRunResult['pageRecords'][number],
  progress: ScanProgressUpdate,
) => Promise<void>;

export class ScanCancelledError extends Error {
  constructor() {
    super('Scan cancelled');
    this.name = 'ScanCancelledError';
  }
}

export interface RunWebsiteScanOptions {
  isCancelled?: () => boolean;
}

async function withTimeout<T>(label: string, timeoutMs: number, fn: () => Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${timeoutMs}ms`)),
      timeoutMs,
    );
  });
  try {
    return await Promise.race([fn(), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function isTargetClosedError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /has been closed|Target closed|Target page, context or browser|browser has disconnected/i.test(
    message,
  );
}

/** Page-independent delay — unlike page.waitForTimeout, survives page/browser crashes. */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function assertPageOpen(page: Page, label: string) {
  if (page.isClosed()) {
    throw new Error(`Browser page closed during ${label} (Chromium crash or navigation abort)`);
  }
}

async function settlePage(page: Page, ms: number, label = 'settle') {
  await delay(ms);
  await assertPageOpen(page, label);
}

async function waitForCmpSdk(page: Page, timeoutMs = 15000) {
  try {
    await page.waitForFunction(
      () => {
        const cmp = (window as unknown as { __CMP__?: { ready?: boolean; acceptAll?: () => void } }).__CMP__;
        return Boolean(cmp?.ready || typeof cmp?.acceptAll === 'function');
      },
      { timeout: timeoutMs },
    );
    await settlePage(page, 500, 'CMP settle');
  } catch (error) {
    if (isTargetClosedError(error)) throw error;
    /* CMP may not be installed on this site */
  }
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

async function captureFrameStorageSnapshots(page: Page): Promise<FrameStorageSnapshot[]> {
  const snapshots: FrameStorageSnapshot[] = [];

  for (const frame of page.frames()) {
    if (frame === page.mainFrame()) continue;
    const frameUrl = frame.url();
    if (!frameUrl || frameUrl === 'about:blank' || frameUrl.startsWith('about:')) continue;

    try {
      const storage = await frame.evaluate(async () => {
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

        return { localStorage, sessionStorage, indexedDbNames };
      });

      snapshots.push({
        frameUrl,
        localStorage: storage.localStorage,
        sessionStorage: storage.sessionStorage,
        indexedDbNames: storage.indexedDbNames,
      });
    } catch {
      /* cross-origin or detached frame */
    }
  }

  return snapshots;
}

async function navigateForScan(
  page: Page,
  url: string,
  jsRendering: boolean,
  timeoutMs: number,
) {
  await page.goto(url, {
    // Networkidle often never settles on analytics-heavy WP sites; load is enough.
    waitUntil: jsRendering ? 'load' : 'domcontentloaded',
    timeout: timeoutMs,
  });
  await assertPageOpen(page, 'navigation');
  if (jsRendering) {
    await settlePage(page, 1500, 'post-navigation settle');
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
  if (await button.count() > 0) {
    try {
      await button.click({ timeout: 3000 });
      await settlePage(page, 800, 'CMP click settle');
      return true;
    } catch (error) {
      if (isTargetClosedError(error)) throw error;
      /* fall through to SDK API */
    }
  }

  const sdkAction =
    action === 'accept-all'
      ? 'acceptAll'
      : action === 'reject-all'
        ? 'rejectAll'
        : null;
  if (!sdkAction) return false;

  try {
    const invoked = await page.evaluate((method) => {
      const cmp = (window as unknown as { __CMP__?: Record<string, () => void> }).__CMP__;
      if (!cmp || typeof cmp[method] !== 'function') return false;
      cmp[method]();
      return true;
    }, sdkAction);
    if (invoked) {
      await settlePage(page, 1000, 'CMP API settle');
      return true;
    }
  } catch (error) {
    if (isTargetClosedError(error)) throw error;
  }

  return false;
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
  const frameSnapshots = await captureFrameStorageSnapshots(page);
  const frameFindings = frameStorageToFindings(
    frameSnapshots,
    consentState,
    pageId,
    siteHostname,
  );

  return [...cookieFindings, ...domFindings, ...frameFindings];
}

export async function runWebsiteScan(
  scan: DomainScan,
  onPageScanned?: ScanPageProgressHandler,
  options?: RunWebsiteScanOptions,
): Promise<ScanRunResult> {
  const playwright = await loadPlaywright();
  const includePaths = (scan.includePaths as string[] | null) ?? undefined;
  const excludePaths = (scan.excludePaths as string[] | null) ?? undefined;
  const siteHostname = getHostname(scan.startUrl);
  if (!siteHostname) {
    throw new Error('Invalid start URL hostname');
  }

  const browser: Browser = await playwright.chromium.launch({
    headless: true,
    args: CHROMIUM_LAUNCH_ARGS,
  });

  const contextOptions =
    scan.deviceType === 'mobile'
      ? playwright.devices['Pixel 7']
      : { viewport: { width: 1366, height: 900 } };

  let context: BrowserContext | null = null;
  let page: Page | null = null;
  let pageCrashed = false;

  const createSession = async (): Promise<{ context: BrowserContext; page: Page }> => {
    if (page && !page.isClosed()) {
      try {
        await page.close();
      } catch {
        /* ignore */
      }
    }
    if (context) {
      try {
        await context.close();
      } catch {
        /* ignore */
      }
    }

    const nextContext = await browser.newContext({
      ...contextOptions,
      userAgent: SCANNER_USER_AGENT,
      locale: 'en-US',
      extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' },
    });

    // Fonts/media bloat Chromium on Cloud Run (Avada/WP themes). Keep images so
    // tracking pixels still appear in network + DOM capture.
    await nextContext.route('**/*', (route) => {
      const type = route.request().resourceType();
      if (type === 'media' || type === 'font') {
        return route.abort();
      }
      return route.continue();
    });

    const nextPage = await nextContext.newPage();
    pageCrashed = false;
    nextPage.on('crash', () => {
      pageCrashed = true;
    });

    context = nextContext;
    page = nextPage;
    return { context: nextContext, page: nextPage };
  };

  const ensureSession = async (): Promise<{ context: BrowserContext; page: Page }> => {
    if (page && !page.isClosed() && context && !pageCrashed) {
      return { context, page };
    }
    return createSession();
  };

  await createSession();

  const queue: Array<{ url: string; depth: number }> = [{ url: scan.startUrl, depth: 0 }];
  const seen = new Set<string>();
  const allFindings: ScanFindingInput[] = [];
  const pageRecords: ScanRunResult['pageRecords'] = [];
  let pagesScanned = 0;

  const homepageOnly = scan.maxDepth === 0;

  if (!homepageOnly) {
    const homeLinks = await discoverLinksFromFetchPage(scan.startUrl, siteHostname);
    enqueueDiscoveredLinks(homeLinks, 1, seen, queue, includePaths, excludePaths);

    const sitemapUrls = await discoverSitemapUrls(scan.startUrl, siteHostname);
    enqueueDiscoveredLinks(sitemapUrls, 1, seen, queue, includePaths, excludePaths);
  }

  const startNormalized = normalizeUrl(scan.startUrl);

  const pageBudgetMs = Math.min(scan.timeoutMs * 4, 120_000);

  const scanSinglePage = async (
    activePage: Page,
    activeContext: BrowserContext,
    normalized: string,
    current: { url: string; depth: number },
  ) => {
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
    activePage.on('request', onRequest);

    let pageStatus = 'ok';
    let errorMessage: string | null = null;
    const pageFindings: ScanFindingInput[] = [];
    let discoveredLinks: string[] = [];

    try {
      await withTimeout('page scan', pageBudgetMs, async () => {
        await navigateForScan(activePage, normalized, scan.jsRendering, scan.timeoutMs);

        const runFullConsentProbe =
          startNormalized !== null && normalized === startNormalized;
        if (runFullConsentProbe) {
          await waitForCmpSdk(activePage, Math.min(scan.timeoutMs, 15000));
        }

        const pageIdPlaceholder = null;
        const html = await activePage.content();
        const anchorHrefs = await extractAnchorHrefs(activePage);
        if (current.depth < scan.maxDepth) {
          discoveredLinks = mergeDiscoveredLinks(html, anchorHrefs, normalized, siteHostname);
        }

        pageFindings.push(
          ...(await scanPageState(
            activePage,
            activeContext,
            'BEFORE_CONSENT',
            normalized,
            pageIdPlaceholder,
            siteHostname,
            networkUrls,
          )),
        );

        if (runFullConsentProbe) {
          const accepted = await clickCmpAction(activePage, 'accept-all');
          if (accepted) {
            await settlePage(activePage, 1000, 'after-accept settle');
            pageFindings.push(
              ...(await scanPageState(
                activePage,
                activeContext,
                'AFTER_ACCEPT',
                normalized,
                pageIdPlaceholder,
                siteHostname,
                networkUrls,
              )),
            );
          }

          try {
            await navigateForScan(activePage, normalized, scan.jsRendering, scan.timeoutMs);
            await waitForCmpSdk(activePage, 5000);
            const rejected = await clickCmpAction(activePage, 'reject-all');
            if (rejected) {
              await settlePage(activePage, 800, 'after-reject settle');
              pageFindings.push(
                ...(await scanPageState(
                  activePage,
                  activeContext,
                  'AFTER_REJECT',
                  normalized,
                  pageIdPlaceholder,
                  siteHostname,
                  networkUrls,
                )),
              );
            }
          } catch (rejectError) {
            if (isTargetClosedError(rejectError)) throw rejectError;
            if (!errorMessage) {
              errorMessage =
                rejectError instanceof Error
                  ? `Reject capture failed: ${rejectError.message}`
                  : 'Reject capture failed';
            }
          }
        }
      });
    } catch (error) {
      pageStatus = 'failed';
      if (pageCrashed || isTargetClosedError(error)) {
        errorMessage =
          'Scanner browser closed unexpectedly (often Chromium OOM or a bot challenge). Retry the scan.';
      } else {
        errorMessage = error instanceof Error ? error.message : 'Page scan failed';
      }
      throw Object.assign(error instanceof Error ? error : new Error(String(error)), {
        pageStatus,
        errorMessage,
        pageFindings,
        discoveredLinks,
      });
    } finally {
      activePage.off('request', onRequest);
    }

    return { pageStatus, errorMessage, pageFindings, discoveredLinks };
  };

  try {
    while (queue.length > 0 && pagesScanned < scan.maxPages) {
      if (options?.isCancelled?.()) {
        throw new ScanCancelledError();
      }

      const current = queue.shift()!;
      const normalized = normalizeUrl(current.url);
      if (!normalized || seen.has(normalized)) continue;

      const pathName = new URL(normalized).pathname;
      if (!matchesPathRules(pathName, includePaths, excludePaths)) continue;

      seen.add(normalized);

      let pageStatus = 'ok';
      let errorMessage: string | null = null;
      let pageFindings: ScanFindingInput[] = [];
      let discoveredLinks: string[] = [];

      const maxAttempts = 2;
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        const session = await ensureSession();

        try {
          const result = await scanSinglePage(session.page, session.context, normalized, current);
          pageStatus = result.pageStatus;
          errorMessage = result.errorMessage;
          pageFindings = result.pageFindings;
          discoveredLinks = result.discoveredLinks;
          break;
        } catch (error) {
          const detail = error as {
            pageStatus?: string;
            errorMessage?: string;
            pageFindings?: ScanFindingInput[];
            discoveredLinks?: string[];
          };
          pageStatus = detail.pageStatus ?? 'failed';
          errorMessage =
            detail.errorMessage ??
            (error instanceof Error ? error.message : 'Page scan failed');
          pageFindings = detail.pageFindings ?? [];
          discoveredLinks = detail.discoveredLinks ?? [];

          const closed =
            pageCrashed || isTargetClosedError(error) || session.page.isClosed();
          if (attempt < maxAttempts && closed) {
            await createSession();
            continue;
          }
          break;
        }
      }

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

      pagesScanned += 1;
      const pageRecord = {
        url: normalized,
        canonicalUrl: normalized,
        status: pageStatus,
        depth: current.depth,
        errorMessage,
        findings: dedupeFindings(pageFindings),
      };
      pageRecords.push(pageRecord);
      allFindings.push(...pageFindings);

      if (onPageScanned) {
        const progressStats = countFindingStats(dedupeFindings(allFindings));
        await onPageScanned(pageRecord, {
          pagesScanned,
          cookiesFound: progressStats.cookies,
          trackersFound: progressStats.trackers,
        });
      }
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
