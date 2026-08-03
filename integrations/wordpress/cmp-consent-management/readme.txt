=== CMP Consent Management ===
Contributors: varnarc
Tags: consent, cookie, cmp, privacy, gdpr
Requires at least: 6.0
Tested up to: 6.7
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Connect WordPress to the CMP platform for consent banners, auto-blocking, cookie declarations, and scans.

== Description ==

* Automatic CMP script injection in `wp_head` (priority 0 by default)
* API key connection with domain picker
* Shortcodes for cookie declaration and privacy trigger
* Start website scans from WP admin
* Installation validation via Developer API
* Multisite-compatible per-site settings
* Reports `data-integration="wordpress"` for dashboard diagnostics

== Installation ==

1. Copy `cmp-consent-management` to `wp-content/plugins/` or install from zip.
2. Activate the plugin.
3. Go to **Settings → CMP Consent**.
4. Enter API base URL (e.g. `https://api.example.com/api/v1`) and an API key from **Developers** in the CMP admin.
5. Click **Load domains**, select your site, and save.
6. Visit your site and run **Validate installation** in the plugin settings.

== Shortcodes ==

* `[cmp_cookie_declaration]` — embed cookie declaration
* `[cmp_privacy_trigger label="Privacy settings" style="button"]` — open preference center

== Cache plugins ==

The CMP script is injected via `wp_head` with early priority. Exclude `cmp-sdk` from script defer/delay if your optimizer breaks consent initialization.

== Changelog ==

= 1.0.0 =
* Initial release
