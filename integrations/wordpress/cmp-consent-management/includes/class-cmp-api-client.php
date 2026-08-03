<?php

if (!defined('ABSPATH')) {
    exit;
}

class CMP_API_Client {
    private CMP_Settings $settings;

    public function __construct(CMP_Settings $settings) {
        $this->settings = $settings;
    }

    public function is_ready(): bool {
        return $this->settings->get('api_base_url') && $this->settings->get('api_key');
    }

    /**
     * @return array{ok:bool,data?:mixed,error?:array}
     */
    public function request(string $method, string $path, ?array $body = null): array {
        $base = rtrim((string) $this->settings->get('api_base_url'), '/');
        $key = (string) $this->settings->get('api_key');
        if (!$base || !$key) {
            return ['ok' => false, 'error' => ['message' => 'API base URL and API key are required']];
        }

        $url = $base . '/developer/v1' . $path;
        $args = [
            'method' => $method,
            'timeout' => 20,
            'headers' => [
                'Authorization' => 'Bearer ' . $key,
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
            ],
        ];

        if ($body !== null) {
            $args['body'] = wp_json_encode($body);
        }

        $response = wp_remote_request($url, $args);
        if (is_wp_error($response)) {
            return ['ok' => false, 'error' => ['message' => $response->get_error_message()]];
        }

        $code = (int) wp_remote_retrieve_response_code($response);
        $raw = wp_remote_retrieve_body($response);
        $json = json_decode($raw, true);
        if (!is_array($json)) {
            return ['ok' => false, 'error' => ['message' => 'Invalid API response']];
        }

        if ($code >= 400) {
            $message = $json['error']['message'] ?? $json['message'] ?? 'API request failed';
            return ['ok' => false, 'error' => ['message' => $message, 'code' => $code]];
        }

        return $json;
    }

    public function list_domains(): array {
        return $this->request('GET', '/domains?page=1&limit=100');
    }

    public function get_domain(string $domain_id): array {
        return $this->request('GET', '/domains/' . rawurlencode($domain_id));
    }

    public function get_installation_script(string $domain_id): array {
        return $this->request('GET', '/domains/' . rawurlencode($domain_id) . '/installation-script');
    }

    public function validate_installation(string $domain_id): array {
        return $this->request('POST', '/domains/' . rawurlencode($domain_id) . '/validate-installation');
    }

    public function start_scan(string $domain_id, string $start_url): array {
        return $this->request('POST', '/domains/' . rawurlencode($domain_id) . '/scans', [
            'startUrl' => $start_url,
            'maxPages' => 25,
            'maxDepth' => 2,
        ]);
    }
}
