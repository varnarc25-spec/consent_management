<?php

if (!defined('ABSPATH')) {
    exit;
}

class CMP_Shortcodes {
    private CMP_Settings $settings;

    public function __construct(CMP_Settings $settings) {
        $this->settings = $settings;
        add_shortcode('cmp_cookie_declaration', [$this, 'cookie_declaration']);
        add_shortcode('cmp_privacy_trigger', [$this, 'privacy_trigger']);
    }

    public function cookie_declaration($atts = []): string {
        if (!$this->settings->is_configured()) {
            return '';
        }

        $atts = shortcode_atts([
            'id' => 'cmp-cookie-declaration-' . wp_generate_uuid4(),
            'class' => '',
        ], $atts, 'cmp_cookie_declaration');

        $id = sanitize_html_class($atts['id']);
        $class = esc_attr($atts['class']);

        $html = sprintf(
            '<div id="%s" class="cmp-cookie-declaration-embed %s" data-cmp-cookie-declaration="true"></div>',
            esc_attr($id),
            $class
        );

        $html .= sprintf(
            '<script>document.addEventListener("cmp:ready",function(){if(window.__CMP__&&window.__CMP__.openCookieDeclaration){window.__CMP__.openCookieDeclaration("#%s");}});if(window.__CMP__&&window.__CMP__.ready&&window.__CMP__.openCookieDeclaration){window.__CMP__.openCookieDeclaration("#%s");}</script>',
            esc_js($id),
            esc_js($id)
        );

        return $html;
    }

    public function privacy_trigger($atts = []): string {
        if (!$this->settings->is_configured()) {
            return '';
        }

        $atts = shortcode_atts([
            'label' => __('Privacy settings', 'cmp-consent-management'),
            'style' => 'button',
        ], $atts, 'cmp_privacy_trigger');

        $label = esc_html($atts['label']);
        $style = $atts['style'] === 'link' ? 'link' : 'button';

        if ($style === 'link') {
            return sprintf(
                '<button type="button" class="cmp-wp-privacy-link" data-cmp-privacy-trigger="true" onclick="if(window.__CMP__&&window.__CMP__.openPreferences){window.__CMP__.openPreferences();}">%s</button>',
                $label
            );
        }

        return sprintf(
            '<button type="button" class="cmp-wp-privacy-button" data-cmp-privacy-trigger="true" onclick="if(window.__CMP__&&window.__CMP__.openPreferences){window.__CMP__.openPreferences();}">%s</button>',
            $label
        );
    }
}
