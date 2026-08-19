'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { getBannerContrastWarnings, scopeBannerCustomCss } from '@cmp/utils';

export interface BannerPreviewProps {
  title: string;
  description: string;
  contentFormat?: 'plain' | 'basic_html';
  acceptButton: string;
  rejectButton: string;
  preferencesButton: string;
  saveButton?: string;
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
  /** Live site hostname or full URL shown behind the banner. */
  websiteUrl?: string | null;
  /** Full-bleed CookieYes-style preview (fills the studio stage). */
  variant?: 'card' | 'studio';
  allowClose?: boolean;
  onViewportChange?: (viewport: 'desktop' | 'tablet' | 'mobile') => void;
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

function normalizeWebsiteUrl(value?: string | null): string | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, '')}`;
}

export function BannerPreview({
  title,
  description,
  contentFormat = 'plain',
  acceptButton,
  rejectButton,
  preferencesButton,
  closeButton,
  legalNotice,
  footerContent,
  privacyPolicyUrl,
  cookiePolicyUrl,
  layout,
  theme,
  viewport = 'desktop',
  websiteUrl,
  variant = 'card',
  allowClose = false,
  onViewportChange,
}: BannerPreviewProps) {
  const isStudio = variant === 'studio';
  const frameWidth = isStudio
    ? viewport === 'mobile'
      ? 390
      : viewport === 'tablet'
        ? 768
        : undefined
    : viewport === 'mobile'
      ? 375
      : viewport === 'tablet'
        ? 768
        : 1100;
  const frameHeight = isStudio ? undefined : viewport === 'mobile' ? 640 : 480;
  const primary = theme?.primaryColor ?? '#0192d0';
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
  const resolvedUrl = useMemo(() => normalizeWebsiteUrl(websiteUrl), [websiteUrl]);
  const [iframeStatus, setIframeStatus] = useState<'idle' | 'loading' | 'loaded' | 'blocked'>('idle');

  useEffect(() => {
    if (!resolvedUrl) {
      setIframeStatus('idle');
      return;
    }
    setIframeStatus('loading');
    const timer = window.setTimeout(() => {
      setIframeStatus((current) => (current === 'loading' ? 'blocked' : current));
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [resolvedUrl, viewport]);

  const primaryButtonStyle: CSSProperties =
    theme?.buttonStyle === 'outline'
      ? { background: 'transparent', color: primary, border: `1px solid ${primary}` }
      : theme?.buttonStyle === 'soft'
        ? { background: `${primary}1a`, color: primary, border: 0 }
        : { background: primary, color: buttonText, border: 0 };

  return (
    <div
      className={isStudio ? 'cy-preview-studio' : undefined}
      data-viewport={isStudio ? viewport : undefined}
      style={
        isStudio
          ? undefined
          : { border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', background: '#f8fafc' }
      }
    >
      {scopedCss ? <style>{scopedCss}</style> : null}
      {resolvedUrl && !isStudio ? (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.5rem 0.75rem',
            borderBottom: '1px solid var(--border)',
            fontSize: '.75rem',
            color: 'var(--muted)',
            background: '#fff',
          }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Previewing {resolvedUrl}
          </span>
          <a href={resolvedUrl} target="_blank" rel="noopener noreferrer" style={{ color: primary, flexShrink: 0 }}>
            Open site
          </a>
        </div>
      ) : null}
      <div
        className={isStudio ? 'cy-preview-frame' : undefined}
        style={
          isStudio
            ? undefined
            : {
                position: 'relative',
                height: frameHeight,
                width: '100%',
                maxWidth: frameWidth ?? '100%',
                margin: '0 auto',
                background: resolvedUrl ? '#fff' : 'linear-gradient(180deg,#eef2ff,#f8fafc)',
                overflow: 'hidden',
              }
        }
      >
        {resolvedUrl ? (
          <>
            {/* eslint-disable-next-line react/iframe-missing-sandbox -- preview needs full site rendering */}
            <iframe
              key={`${resolvedUrl}-${viewport}`}
              title="Website preview"
              src={resolvedUrl}
              referrerPolicy="no-referrer"
              onLoad={() => setIframeStatus('loaded')}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                border: 0,
                pointerEvents: 'none',
                background: '#fff',
              }}
            />
            {(iframeStatus === 'loading' || iframeStatus === 'blocked') && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '1.5rem',
                  textAlign: 'center',
                  background:
                    iframeStatus === 'blocked'
                      ? 'linear-gradient(180deg,#eef2ff,#f8fafc)'
                      : 'rgba(248,250,252,.72)',
                  color: '#4b5563',
                  fontSize: '.875rem',
                  zIndex: 1,
                  pointerEvents: 'none',
                }}
              >
                {iframeStatus === 'loading'
                  ? 'Loading website…'
                  : 'This site blocks embedding in previews (X-Frame-Options / CSP). Banner styling still shows below — use “Open site” or Test live banner for the real page.'}
              </div>
            )}
          </>
        ) : null}

        {isModal && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `rgba(17,24,39,${overlayOpacity})`,
              zIndex: 2,
            }}
          />
        )}
        <section
          aria-label="Banner preview"
          className="cmp-preview-root"
          style={{
            position: 'absolute',
            zIndex: 3,
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
          {isStudio || allowClose || closeButton ? (
            <button
              type="button"
              aria-label={closeButton || 'Close'}
              style={{
                position: 'absolute',
                top: 10,
                right: 12,
                border: 0,
                background: 'transparent',
                color: text,
                fontSize: 18,
                lineHeight: 1,
                cursor: 'default',
              }}
            >
              ×
            </button>
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
      {!isStudio ? (
      <div
        style={{
          padding: '0.75rem 1rem',
          borderTop: '1px solid var(--border)',
          fontSize: '.8125rem',
        }}
      >
        {contrastWarnings.map((warning) => (
          <p key={warning.pair} style={{ margin: '0.25rem 0', color: warning.passes === false ? '#b45309' : 'var(--muted)' }}>
            {warning.pair}: {warning.ratio ? warning.ratio.toFixed(2) : 'n/a'}:1
            {warning.passes === false ? ' — contrast may be too low' : warning.passes ? ' — OK' : ''}
          </p>
        ))}
      </div>
      ) : null}
      {isStudio && onViewportChange ? (
        <div className="cy-preview-devices" role="group" aria-label="Preview size">
          {(['desktop', 'tablet', 'mobile'] as const).map((size) => (
            <button
              key={size}
              type="button"
              className={viewport === size ? 'active' : undefined}
              aria-pressed={viewport === size}
              aria-label={size}
              onClick={() => onViewportChange(size)}
            >
              {size === 'desktop' ? (
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path fill="currentColor" d="M4 5h16v11H4V5Zm-1 13h18v2H3v-2Z" />
                </svg>
              ) : size === 'tablet' ? (
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path fill="currentColor" d="M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm6 16.25a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path fill="currentColor" d="M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm4 18.2a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
                </svg>
              )}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
