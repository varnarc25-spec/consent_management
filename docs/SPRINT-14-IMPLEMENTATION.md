# Sprint 14 — Languages and Branding

## Summary

Sprint 14 adds multilingual banner and preference-center copy, translation management in the admin, RTL layout support, automatic translation suggestions (phrase-map based), and contrast warnings on the banner theme editor.

## Backend

- **Translation storage**: `bannerContent.translations` on policy versions (`Record<lang, partial fields>`) plus `supportedLanguages` and `legalText.defaultLanguage`.
- **Language detection** (`@cmp/utils/language`): priority — URL `cmp_lang` → stored preference → script `data-lang` → browser → default language → fallback.
- **API**: `POST /domains/:domainId/consent/policies/:policyId/translation-suggestions` returns built-in phrase-map suggestions.
- **Public config**: returns `supportedLanguages`, `defaultLanguage`, and full `banner.translations` for client-side locale switching.

## SDK

- `packages/sdk/src/language.ts` — locale resolution, `applyBannerTranslation`, RTL detection, preference storage (`cmp_lang_<domainKey>`).
- `CmpSdk.setLanguage(lang)` — switches locale, re-renders banner/trigger.
- `window.__CMP__.setLanguage` / `getActiveLanguage`.
- Script tag: `data-lang="de"` for default override hint.
- Banner renderer: `dir` / `lang` on root, RTL layout CSS (corner popup, side panel, close button).

## Admin

- **Languages** tab on domain consent page: supported languages, default language, per-locale editor, missing-translation indicators, suggest button, RTL preview toggle.
- **Banner** tab: contrast warnings under theme colors; preview language selector.
- `BannerPreview`: `dir` prop for RTL preview.

## Tests

- `packages/utils/src/language/language.spec.ts`
- `packages/sdk/src/language.spec.ts`

## Usage

```html
<script
  src="https://your-api/public/cmp/sdk.js"
  data-domain-key="your-key"
  data-lang="de"
></script>
```

```js
window.__CMP__?.setLanguage('ar');
```

URL override: `?cmp_lang=fr`

## Notes

- Automatic suggestions use curated phrase maps — not machine translation. Review before publish.
- Default-language copy is edited on the Banner tab; other locales on the Languages tab.
