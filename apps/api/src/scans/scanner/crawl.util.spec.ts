import { describe, expect, it } from 'vitest';
import {
  buildStartUrl,
  extractLinks,
  isSameSite,
  matchesPathRules,
  normalizeUrl,
} from './crawl.util';

describe('crawl.util', () => {
  it('normalizes URLs and strips hash', () => {
    expect(normalizeUrl('https://example.com/path/#section')).toBe('https://example.com/path');
    expect(normalizeUrl('/about', 'https://example.com/blog/')).toBe('https://example.com/about');
  });

  it('matches include and exclude path rules', () => {
    expect(matchesPathRules('/blog/post', ['/blog'], ['/blog/private'])).toBe(true);
    expect(matchesPathRules('/blog/private/1', ['/blog'], ['/blog/private'])).toBe(false);
    expect(matchesPathRules('/docs', ['/blog'])).toBe(false);
  });

  it('extracts same-site links from HTML', () => {
    const html = `
      <a href="/about">About</a>
      <a href="https://example.com/contact">Contact</a>
      <a href="https://other.com/page">External</a>
    `;
    const links = extractLinks(html, 'https://example.com/', 'example.com');
    expect(links).toContain('https://example.com/about');
    expect(links).toContain('https://example.com/contact');
    expect(links.some((link) => link.includes('other.com'))).toBe(false);
  });

  it('detects same-site hostnames', () => {
    expect(isSameSite('https://www.example.com/page', 'example.com')).toBe(true);
    expect(isSameSite('https://cdn.example.com/page', 'example.com')).toBe(true);
    expect(isSameSite('https://evil.com', 'example.com')).toBe(false);
  });

  it('builds default start URL from hostname', () => {
    expect(buildStartUrl('example.com')).toBe('https://example.com/');
  });
});
