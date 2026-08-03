<?php
/**
 * CMP Consent Management
 *
 * @package           CMP_Consent_Management
 * @author            Varnarc CMP
 * @copyright         2026 Varnarc
 * @license           GPL-2.0-or-later
 *
 * @wordpress-plugin
 * Plugin Name:       CMP Consent Management
 * Plugin URI:        https://github.com/varnarc/consent-management
 * Description:       Connect your WordPress site to the CMP platform — script injection, cookie declaration, privacy trigger, scans, and installation validation.
 * Version:           1.0.0
 * Requires at least: 6.0
 * Requires PHP:      7.4
 * Author:            Varnarc
 * License:           GPL v2 or later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       cmp-consent-management
 */

if (!defined('ABSPATH')) {
    exit;
}

define('CMP_CM_VERSION', '1.0.0');
define('CMP_CM_PLUGIN_FILE', __FILE__);
define('CMP_CM_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('CMP_CM_PLUGIN_URL', plugin_dir_url(__FILE__));

require_once CMP_CM_PLUGIN_DIR . 'includes/class-cmp-settings.php';
require_once CMP_CM_PLUGIN_DIR . 'includes/class-cmp-api-client.php';
require_once CMP_CM_PLUGIN_DIR . 'includes/class-cmp-public.php';
require_once CMP_CM_PLUGIN_DIR . 'includes/class-cmp-shortcodes.php';
require_once CMP_CM_PLUGIN_DIR . 'includes/class-cmp-admin.php';
require_once CMP_CM_PLUGIN_DIR . 'includes/class-cmp-multisite.php';

final class CMP_Consent_Management {
    private static ?CMP_Consent_Management $instance = null;

    public CMP_Settings $settings;
    public CMP_API_Client $api;
    public CMP_Public $public;
    public CMP_Shortcodes $shortcodes;
    public CMP_Admin $admin;

    public static function instance(): CMP_Consent_Management {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        $this->settings = new CMP_Settings();
        $this->api = new CMP_API_Client($this->settings);
        $this->public = new CMP_Public($this->settings);
        $this->shortcodes = new CMP_Shortcodes($this->settings);
        $this->admin = new CMP_Admin($this->settings, $this->api);

        if (is_multisite()) {
            new CMP_Multisite($this->settings);
        }

        register_activation_hook(__FILE__, [$this->settings, 'on_activate']);
    }
}

CMP_Consent_Management::instance();
