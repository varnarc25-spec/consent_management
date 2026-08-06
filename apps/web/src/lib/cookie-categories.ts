export const COOKIE_CATEGORY_LABELS: Record<string, string> = {
  strictly_necessary: 'Necessary',
  preferences: 'Preferences',
  functional: 'Functional',
  analytics: 'Statistics',
  performance: 'Performance',
  marketing: 'Marketing',
  social_media: 'Social Media',
  unclassified: 'Unclassified',
};

export const COOKIE_CATEGORY_ORDER = [
  'strictly_necessary',
  'preferences',
  'functional',
  'analytics',
  'performance',
  'marketing',
  'social_media',
  'unclassified',
] as const;

export interface CookieCategoryCount {
  slug: string;
  name: string;
  count: number;
}

export interface CookieCategorySummary {
  total: number;
  categories: CookieCategoryCount[];
}

export function sortCookieCategories(categories: CookieCategoryCount[]) {
  const bySlug = new Map(categories.map((c) => [c.slug, c]));
  const ordered: Array<{ slug: string; label: string; count: number }> = COOKIE_CATEGORY_ORDER
    .filter((slug) => bySlug.has(slug))
    .map((slug) => ({
      slug,
      label: COOKIE_CATEGORY_LABELS[slug] ?? bySlug.get(slug)!.name,
      count: bySlug.get(slug)!.count,
    }));
  const knownSlugs = new Set<string>(COOKIE_CATEGORY_ORDER);
  for (const c of categories) {
    if (!knownSlugs.has(c.slug)) {
      ordered.push({
        slug: c.slug,
        label: COOKIE_CATEGORY_LABELS[c.slug] ?? c.name,
        count: c.count,
      });
    }
  }
  return ordered;
}
