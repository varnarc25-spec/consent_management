<?php

if (!defined('ABSPATH')) {
    exit;
}

class CMP_Settings {
    public const OPTION_GROUP = 'cmp_consent_management';
    public const OPTION_NAME = 'cmp_consent_management_settings';

    public function on_activate(): void {
        if (!get_option(self::OPTION_NAME)) {
            update_option(self::OPTION_NAME, $this->defaults());
        }
    }

    public function defaults(): array {
        return [
            'enabled' => true,
            'api_base_url' => '',
            'api_key' => '',
            'domain_id' => '',
            'domain_key' => '',
            'sdk_url' => '',
            'environment' => 'production',
            'debug_mode' => false,
            'script_priority' => 0,
        ];
    }

    public function get_all(): array {
        $stored = get_option(self::OPTION_NAME, []);
        if (!is_array($stored)) {
            $stored = [];
        }
        return array_merge($this->defaults(), $stored);
    }

    public function get(string $key, $default = null) {
        $all = $this->get_all();
        return $all[$key] ?? $default;
    }

    public function update(array $values): void {
        $merged = array_merge($this->get_all(), $values);
        update_option(self::OPTION_NAME, $merged);
    }

    public function is_configured(): bool {
        return $this->get('domain_key') && ($this->get('sdk_url') || $this->get('api_base_url'));
    }
}
