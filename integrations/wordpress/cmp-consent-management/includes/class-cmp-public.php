<?php

if (!defined('ABSPATH')) {
    exit;
}

class CMP_Public {
    private CMP_Settings $settings;

    public function __construct(CMP_Settings $settings) {
        $this->settings = $settings;
        add_action('wp_head', [$this, 'inject_cmp_script'], (int) $settings->get('script_priority', 0));
    }

    public function inject_cmp_script(): void {
        if (is_admin() || !$this->settings->get('enabled')) {
            return;
        }

        $domain_key = (string) $this->settings->get('domain_key');
        if (!$domain_key) {
            return;
        }

        $sdk_url = (string) $this->settings->get('sdk_url');
        if (!$sdk_url) {
            $api_base = rtrim((string) $this->settings->get('api_base_url'), '/');
            if ($api_base) {
                $sdk_url = $api_base . '/public/cmp/sdk.js';
            }
        }

        if (!$sdk_url) {
            return;
        }

        $attrs = [
            'src' => esc_url($sdk_url),
            'data-domain-key' => esc_attr($domain_key),
            'data-env' => esc_attr((string) $this->settings->get('environment', 'production')),
            'data-integration' => 'wordpress',
            'async' => true,
            'id' => 'cmp-sdk',
        ];

        if ($this->settings->get('debug_mode')) {
            $attrs['data-debug'] = 'true';
        }

        $parts = [];
        foreach ($attrs as $name => $value) {
            if ($value === true) {
                $parts[] = $name;
            } else {
                $parts[] = sprintf('%s="%s"', $name, esc_attr((string) $value));
            }
        }

        echo '<script ' . implode(' ', $parts) . '></script>' . "\n";
    }
}
