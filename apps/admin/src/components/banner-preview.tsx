'use client';

import type { CSSProperties } from 'react';
import { getBannerContrastWarnings, scopeBannerCustomCss } from '@cmp/utils';

export interface BannerPreviewProps {
  title: string;
  description: string;
  contentFormat?: 'plain' | 'basic_html';
  acceptButton: string;
  rejectButton: string;
  preferencesButton: string;
  saveButton: string;
  closeButton?: string;
  legalNotice?: string;
  footerContent?: string;
  privacyPolicyUrl?: string;
  cookiePolicyUrl?: string;
  layout: string;
  theme?: {
    primaryColor?: string;
    backgroundColor?: string;
    textColor?: string;
    buttonTextColor?: string;
    buttonStyle?: 'filled' | 'outline' | 'soft';
    borderRadius?: string;
    fontFamily?: string;
    fontSize?: string;
    spacing?: string;
    shadow?: string;
    overlayOpacity?: number;
    logoUrl?: string;
    customCss?: string;
  };
  viewport?: 'desktop' | 'tablet' | 'mobile';
}

const layoutStyles: Record<string, CSSProperties> = {
  bottom_bar: { bottom: 0, left: 0, right: 0, borderTop: '1px solid #e5e7eb' },
  top_bar: { top: 0, left: 0, right: 0, borderBottom: '1px solid #e5e7eb' },
  center_modal: {
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 'min(560px, calc(100% - 2rem))',
  },
  multi_step_modal: {
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 'min(560px, calc(100% - 2rem))',
  },
  corner_popup: { bottom: '1rem', right: '1rem', width: 'min(380px, calc(100% - 2rem))' },
  fullscreen: { inset: '1rem' },
  side_panel: { top: 0, right: 0, bottom: 0, width: 'min(420px, 100%)', borderLeft: '1px solid #e5e7eb' },
  compact: { bottom: '1rem', left: '1rem', right: '1rem', maxWidth: 720, margin: '0 auto' },
};

export function BannerPreview({
  title,
  description,
  contentFormat = 'plain',
  acceptButton,
  rejectButton,
  preferencesButton,
  legalNotice,
  footerContent,
  privacyPolicyUrl,
  cookiePolicyUrl,
  layout,
  theme,
  viewport = 'desktop',
}: BannerPreviewProps) {
  const frameWidth = viewport === 'mobile' ? 375 : viewport === 'tablet' ? 768 : 1100;
  const primary = theme?.primaryColor ?? '#2563eb';
  const background = theme?.backgroundColor ?? '#ffffff';
  const text = theme?.textColor ?? '#111827';
  const buttonText = theme?.buttonTextColor ?? '#ffffff';
  const radius = theme?.borderRadius ?? '8px';
  const overlayOpacity = theme?.overlayOpacity ?? 0.45;
  const isModal =
    layout === 'center_modal' ||
    layout === 'fullscreen' ||
    layout === 'side_panel' ||
    layout === 'multi_step_modal';
  const contrastWarnings = getBannerContrastWarnings(theme ?? {});
  const scopedCss = scopeBannerCustomCss(theme?.customCss ?? '', '.cmp-preview-root');

  const primaryButtonStyle: CSSProperties =
    theme?.buttonStyle === 'outline'
      ? { background: 'transparent', color: primary, border: `1px solid ${primary}` }
      : theme?.buttonStyle === 'soft'
        ? { background: `${primary}1a`, color: primary, border: 0 }
        : { background: primary, color: buttonText, border: 0 };

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', background: '#f8fafc' }}>
      {scopedCss ? <style>{scopedCss}</style> : null}
      <div
        style={{
          position: 'relative',
          height: 360,
          width: '100%',
          maxWidth: frameWidth,
          margin: '0 auto',
          background: 'linear-gradient(180deg,#eef2ff,#f8fafc)',
        }}
      >
        {isModal && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `rgba(17,24,39,${overlayOpacity})`,
            }}
          />
        )}
        <section
          aria-label="Banner preview"
          className="cmp-preview-root"
          style={{
            position: 'absolute',
            background,
            color: text,
            borderRadius: radius,
            boxShadow: theme?.shadow ?? '0 10px 30px rgba(0,0,0,.15)',
            padding: theme?.spacing ?? '1rem 1.25rem',
            fontFamily: theme?.fontFamily,
            fontSize: theme?.fontSize,
            ...layoutStyles[layout],
          }}
        >
          {theme?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={theme.logoUrl} alt="" style={{ display: 'block', maxHeight: 40, marginBottom: '.75rem' }} />
          ) : null}
          {layout === 'multi_step_modal' && (
            <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1rem' }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: primary }} />
              <span style={{ width: 8, height: 8, borderRadius: 999, background: '#d1d5db' }} />
              <span style={{ width: 8, height: 8, borderRadius: 999, background: '#d1d5db' }} />
            </div>
          )}
          <h3 style={{ margin: '0 0 .5rem', fontSize: '1.125rem' }}>{title || 'Banner title'}</h3>
          {contentFormat === 'basic_html' ? (
            <div
              style={{ margin: '0 0 1rem', fontSize: '.9375rem', lineHeight: 1.5 }}
              dangerouslySetInnerHTML={{ __html: description || 'Banner description' }}
            />
          ) : (
            <p style={{ margin: '0 0 1rem', fontSize: '.9375rem', lineHeight: 1.5 }}>
              {description || 'Banner description'}
            </p>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem' }}>
            <button type="button" style={{ ...primaryButtonStyle, borderRadius: radius, padding: '.625rem 1rem', fontWeight: 600 }}>
              {acceptButton}
            </button>
            <button
              type="button"
              style={{
                background: 'transparent',
                color: text,
                border: '1px solid #d1d5db',
                borderRadius: radius,
                padding: '.625rem 1rem',
                fontWeight: 600,
              }}
            >
              {rejectButton}
            </button>
            <button
              type="button"
              style={{
                background: 'transparent',
                color: text,
                border: '1px solid #d1d5db',
                borderRadius: radius,
                padding: '.625rem 1rem',
                fontWeight: 600,
              }}
            >
              {layout === 'multi_step_modal' ? 'Continue' : preferencesButton}
            </button>
          </div>
          {(privacyPolicyUrl || cookiePolicyUrl) && (
            <div style={{ marginTop: '.75rem', fontSize: '.8125rem', display: 'flex', gap: '1rem' }}>
              {privacyPolicyUrl && <span style={{ color: primary }}>Privacy policy</span>}
              {cookiePolicyUrl && <span style={{ color: primary }}>Cookie policy</span>}
            </div>
          )}
          {legalNotice && <p style={{ marginTop: '.75rem', fontSize: '.75rem', color: '#4b5563' }}>{legalNotice}</p>}
          {footerContent && <p style={{ marginTop: '.5rem', fontSize: '.75rem', color: '#4b5563' }}>{footerContent}</p>}
        </section>
      </div>
      <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border)', fontSize: '.8125rem' }}>
        {contrastWarnings.map((warning) => (
          <p key={warning.pair} style={{ margin: '0.25rem 0', color: warning.passes === false ? '#b45309' : 'var(--muted)' }}>
            {warning.pair}: {warning.ratio ? warning.ratio.toFixed(2) : 'n/a'}:1
            {warning.passes === false ? ' — contrast may be too low' : warning.passes ? ' — OK' : ''}
          </p>
        ))}
      </div>
    </div>
  );
}
