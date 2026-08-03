# CMS integrations

Beyond WordPress, install the CMP using the same snippet from **Domains → Installation script** or the installation wizard.

| Platform | Approach |
|----------|----------|
| **WordPress** | Use the official plugin (`integrations/wordpress/cmp-consent-management`) |
| **Shopify** | Paste snippet in **Online Store → Themes → theme.liquid** before `</head>` |
| **Webflow** | Site settings → Custom code → Head code |
| **Wix** | Settings → Custom code → Head |
| **Drupal / Joomla** | Theme header template or custom module |
| **Magento** | Default layout `<head>` block |
| **Squarespace** | Settings → Advanced → Code injection → Header |
| **GTM** | Custom HTML tag **after** CMP in page HTML; use `data-integration="gtm"` |

## GTM

1. CMP script must load **before** the GTM container snippet.
2. Import `docs/gtm/community-template.tpl` for Consent Mode v2 tag.
3. See `docs/gtm/README.md` for Preview mode diagnostics.

## Integration detection

Add `data-integration="wordpress|gtm|shopify|other"` on the CMP script tag so the dashboard reports how the site was integrated.

## WordPress plugin API

The WordPress plugin uses the Developer API with an API key. See `docs/DEVELOPER-API.md`.
