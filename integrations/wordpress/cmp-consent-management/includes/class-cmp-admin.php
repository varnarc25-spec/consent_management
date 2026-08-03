<?php

if (!defined('ABSPATH')) {
    exit;
}

class CMP_Admin {
    private CMP_Settings $settings;
    private CMP_API_Client $api;

    public function __construct(CMP_Settings $settings, CMP_API_Client $api) {
        $this->settings = $settings;
        $this->api = $api;

        add_action('admin_menu', [$this, 'register_menu']);
        add_action('admin_init', [$this, 'register_settings']);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_assets']);
        add_action('wp_ajax_cmp_test_connection', [$this, 'ajax_test_connection']);
        add_action('wp_ajax_cmp_validate_installation', [$this, 'ajax_validate_installation']);
        add_action('wp_ajax_cmp_start_scan', [$this, 'ajax_start_scan']);
    }

    public function register_menu(): void {
        add_options_page(
            __('CMP Consent', 'cmp-consent-management'),
            __('CMP Consent', 'cmp-consent-management'),
            'manage_options',
            'cmp-consent-management',
            [$this, 'render_page']
        );
    }

    public function register_settings(): void {
        register_setting(CMP_Settings::OPTION_GROUP, CMP_Settings::OPTION_NAME, [
            'type' => 'array',
            'sanitize_callback' => [$this, 'sanitize_settings'],
        ]);
    }

    public function sanitize_settings($input): array {
        $input = is_array($input) ? $input : [];
        $clean = $this->settings->defaults();

        $clean['enabled'] = !empty($input['enabled']);
        $clean['api_base_url'] = esc_url_raw(trim((string) ($input['api_base_url'] ?? '')));
        $clean['api_key'] = sanitize_text_field((string) ($input['api_key'] ?? ''));
        $clean['domain_id'] = sanitize_text_field((string) ($input['domain_id'] ?? ''));
        $clean['domain_key'] = sanitize_text_field((string) ($input['domain_key'] ?? ''));
        $clean['sdk_url'] = esc_url_raw(trim((string) ($input['sdk_url'] ?? '')));
        $clean['environment'] = in_array($input['environment'] ?? 'production', ['production', 'sandbox'], true)
            ? $input['environment']
            : 'production';
        $clean['debug_mode'] = !empty($input['debug_mode']);
        $clean['script_priority'] = max(0, min(999, (int) ($input['script_priority'] ?? 0)));

        return $clean;
    }

    public function enqueue_assets(string $hook): void {
        if ($hook !== 'settings_page_cmp-consent-management') {
            return;
        }
        wp_enqueue_style(
            'cmp-cm-admin',
            CMP_CM_PLUGIN_URL . 'assets/admin.css',
            [],
            CMP_CM_VERSION
        );
        wp_enqueue_script(
            'cmp-cm-admin',
            CMP_CM_PLUGIN_URL . 'assets/admin.js',
            ['jquery'],
            CMP_CM_VERSION,
            true
        );
        wp_localize_script('cmp-cm-admin', 'cmpCmAdmin', [
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('cmp_cm_admin'),
        ]);
    }

    public function ajax_test_connection(): void {
        check_ajax_referer('cmp_cm_admin', 'nonce');
        if (!current_user_can('manage_options')) {
            wp_send_json_error(['message' => 'Forbidden'], 403);
        }

        $result = $this->api->list_domains();
        if (!$result['ok']) {
            wp_send_json_error(['message' => $result['error']['message'] ?? 'Connection failed']);
        }

        wp_send_json_success(['domains' => $result['data']['items'] ?? $result['data'] ?? []]);
    }

    public function ajax_validate_installation(): void {
        check_ajax_referer('cmp_cm_admin', 'nonce');
        if (!current_user_can('manage_options')) {
            wp_send_json_error(['message' => 'Forbidden'], 403);
        }

        $domain_id = (string) $this->settings->get('domain_id');
        if (!$domain_id) {
            wp_send_json_error(['message' => 'Select a domain first']);
        }

        $result = $this->api->validate_installation($domain_id);
        if (!$result['ok']) {
            wp_send_json_error(['message' => $result['error']['message'] ?? 'Validation failed']);
        }

        wp_send_json_success($result['data']);
    }

    public function ajax_start_scan(): void {
        check_ajax_referer('cmp_cm_admin', 'nonce');
        if (!current_user_can('manage_options')) {
            wp_send_json_error(['message' => 'Forbidden'], 403);
        }

        $domain_id = (string) $this->settings->get('domain_id');
        $start_url = esc_url_raw((string) wp_unslash($_POST['start_url'] ?? home_url('/')));
        if (!$domain_id) {
            wp_send_json_error(['message' => 'Select a domain first']);
        }

        $result = $this->api->start_scan($domain_id, $start_url);
        if (!$result['ok']) {
            wp_send_json_error(['message' => $result['error']['message'] ?? 'Scan failed']);
        }

        wp_send_json_success($result['data']);
    }

    public function render_page(): void {
        if (!current_user_can('manage_options')) {
            return;
        }

        $settings = $this->settings->get_all();
        ?>
        <div class="wrap cmp-cm-admin">
            <h1><?php esc_html_e('CMP Consent Management', 'cmp-consent-management'); ?></h1>
            <p class="description">
                <?php esc_html_e('Connect your site to the CMP platform. Create an API key in the admin Developers page with domains:read and scans:write scopes.', 'cmp-consent-management'); ?>
            </p>

            <form method="post" action="options.php">
                <?php settings_fields(CMP_Settings::OPTION_GROUP); ?>
                <table class="form-table" role="presentation">
                    <tr>
                        <th scope="row"><?php esc_html_e('Enable CMP', 'cmp-consent-management'); ?></th>
                        <td>
                            <label>
                                <input type="checkbox" name="<?php echo esc_attr(CMP_Settings::OPTION_NAME); ?>[enabled]" value="1" <?php checked($settings['enabled']); ?> />
                                <?php esc_html_e('Inject CMP script on front-end', 'cmp-consent-management'); ?>
                            </label>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="cmp_api_base"><?php esc_html_e('API base URL', 'cmp-consent-management'); ?></label></th>
                        <td>
                            <input type="url" class="regular-text" id="cmp_api_base" name="<?php echo esc_attr(CMP_Settings::OPTION_NAME); ?>[api_base_url]" value="<?php echo esc_attr($settings['api_base_url']); ?>" placeholder="https://api.example.com/api/v1" />
                            <p class="description"><?php esc_html_e('Your CMP API URL including /api/v1 prefix.', 'cmp-consent-management'); ?></p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="cmp_api_key"><?php esc_html_e('API key', 'cmp-consent-management'); ?></label></th>
                        <td>
                            <input type="password" class="regular-text" id="cmp_api_key" name="<?php echo esc_attr(CMP_Settings::OPTION_NAME); ?>[api_key]" value="<?php echo esc_attr($settings['api_key']); ?>" autocomplete="off" />
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="cmp_domain_id"><?php esc_html_e('Domain ID', 'cmp-consent-management'); ?></label></th>
                        <td>
                            <input type="text" class="regular-text" id="cmp_domain_id" name="<?php echo esc_attr(CMP_Settings::OPTION_NAME); ?>[domain_id]" value="<?php echo esc_attr($settings['domain_id']); ?>" />
                            <button type="button" class="button" id="cmp-test-connection"><?php esc_html_e('Load domains', 'cmp-consent-management'); ?></button>
                            <select id="cmp-domain-picker" style="margin-top:8px;max-width:100%;"></select>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="cmp_domain_key"><?php esc_html_e('Domain key', 'cmp-consent-management'); ?></label></th>
                        <td>
                            <input type="text" class="regular-text" id="cmp_domain_key" name="<?php echo esc_attr(CMP_Settings::OPTION_NAME); ?>[domain_key]" value="<?php echo esc_attr($settings['domain_key']); ?>" />
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="cmp_sdk_url"><?php esc_html_e('SDK URL (optional)', 'cmp-consent-management'); ?></label></th>
                        <td>
                            <input type="url" class="regular-text" id="cmp_sdk_url" name="<?php echo esc_attr(CMP_Settings::OPTION_NAME); ?>[sdk_url]" value="<?php echo esc_attr($settings['sdk_url']); ?>" placeholder="https://api.example.com/api/v1/public/cmp/sdk.js" />
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><?php esc_html_e('Environment', 'cmp-consent-management'); ?></th>
                        <td>
                            <select name="<?php echo esc_attr(CMP_Settings::OPTION_NAME); ?>[environment]">
                                <option value="production" <?php selected($settings['environment'], 'production'); ?>><?php esc_html_e('Production', 'cmp-consent-management'); ?></option>
                                <option value="sandbox" <?php selected($settings['environment'], 'sandbox'); ?>><?php esc_html_e('Sandbox', 'cmp-consent-management'); ?></option>
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><?php esc_html_e('Debug mode', 'cmp-consent-management'); ?></th>
                        <td>
                            <label>
                                <input type="checkbox" name="<?php echo esc_attr(CMP_Settings::OPTION_NAME); ?>[debug_mode]" value="1" <?php checked($settings['debug_mode']); ?> />
                                <?php esc_html_e('Show blocking debugger overlay', 'cmp-consent-management'); ?>
                            </label>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="cmp_script_priority"><?php esc_html_e('Script priority', 'cmp-consent-management'); ?></label></th>
                        <td>
                            <input type="number" min="0" max="999" id="cmp_script_priority" name="<?php echo esc_attr(CMP_Settings::OPTION_NAME); ?>[script_priority]" value="<?php echo esc_attr((string) $settings['script_priority']); ?>" />
                            <p class="description"><?php esc_html_e('Lower numbers load earlier in wp_head (0 = first). Compatible with most cache plugins when injected via wp_head.', 'cmp-consent-management'); ?></p>
                        </td>
                    </tr>
                </table>
                <?php submit_button(); ?>
            </form>

            <hr />
            <h2><?php esc_html_e('Actions', 'cmp-consent-management'); ?></h2>
            <p>
                <button type="button" class="button button-secondary" id="cmp-validate-install"><?php esc_html_e('Validate installation', 'cmp-consent-management'); ?></button>
                <button type="button" class="button button-secondary" id="cmp-start-scan"><?php esc_html_e('Start website scan', 'cmp-consent-management'); ?></button>
            </p>
            <pre id="cmp-action-result" class="cmp-cm-result" hidden></pre>

            <hr />
            <h2><?php esc_html_e('Shortcodes', 'cmp-consent-management'); ?></h2>
            <ul>
                <li><code>[cmp_cookie_declaration]</code> — <?php esc_html_e('Embed cookie declaration table', 'cmp-consent-management'); ?></li>
                <li><code>[cmp_privacy_trigger label="Privacy settings" style="button"]</code> — <?php esc_html_e('Privacy / preferences trigger', 'cmp-consent-management'); ?></li>
            </ul>
            <p class="description">
                <?php esc_html_e('Google Consent Mode is configured in the CMP admin Consent policy — no extra WP settings required.', 'cmp-consent-management'); ?>
            </p>
        </div>
        <?php
    }
}
