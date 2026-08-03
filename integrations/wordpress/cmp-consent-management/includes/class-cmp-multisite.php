<?php

if (!defined('ABSPATH')) {
    exit;
}

class CMP_Multisite {
    private CMP_Settings $settings;

    public function __construct(CMP_Settings $settings) {
        $this->settings = $settings;
        add_action('network_admin_menu', [$this, 'register_network_notice']);
    }

    public function register_network_notice(): void {
        add_action('network_admin_notices', function () {
            if (!current_user_can('manage_network_options')) {
                return;
            }
            echo '<div class="notice notice-info"><p>';
            echo esc_html__(
                'CMP Consent Management: configure API credentials per site under Settings → CMP Consent, or use site-specific domain keys for multisite installs.',
                'cmp-consent-management'
            );
            echo '</p></div>';
        });
    }
}
