'use client';

import type { ReactNode } from 'react';

export type BannerStudioPane =
  | 'general'
  | 'layout'
  | 'content'
  | 'colors'
  | 'css'
  | 'categories'
  | 'regional'
  | 'policy'
  | 'renewals';

const PRIMARY: Array<{ id: BannerStudioPane; label: string; icon: ReactNode }> = [
  {
    id: 'general',
    label: 'General',
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path
          fill="currentColor"
          d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.03 7.03 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 13.9 2h-3.8a.5.5 0 0 0-.5.42l-.36 2.54c-.6.24-1.14.55-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.8 8.48a.5.5 0 0 0 .12.64L4.95 10.7c-.04.31-.06.63-.06.94s.02.63.06.94L2.92 14.16a.5.5 0 0 0-.12.64l1.92 3.32c.13.23.4.32.64.22l2.39-.96c.49.39 1.03.7 1.63.94l.36 2.54c.05.24.26.42.5.42h3.8c.24 0 .45-.18.5-.42l.36-2.54c.6-.24 1.14-.55 1.63-.94l2.39.96c.24.1.51.01.64-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z"
        />
      </svg>
    ),
  },
  {
    id: 'layout',
    label: 'Layout',
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path
          fill="currentColor"
          d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4H3V5Zm0 6h10v10H5a2 2 0 0 1-2-2V11Zm12 0h6v8a2 2 0 0 1-2 2h-4V11Z"
        />
      </svg>
    ),
  },
  {
    id: 'content',
    label: 'Content',
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path fill="currentColor" d="M4 5h16v2H4V5Zm0 4h16v2H4V9Zm0 4h10v2H4v-2Zm0 4h16v2H4v-2Z" />
      </svg>
    ),
  },
  {
    id: 'colors',
    label: 'Colors',
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 3a9 9 0 0 0 0 18c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.36-.6-.36-.99A1.5 1.5 0 0 1 14.25 16h1.88A5.87 5.87 0 0 0 22 10.12 10 10 0 0 0 12 3Zm-5.25 9.75a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm2.25-3.75a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm6 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm2.25 3.75a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z"
        />
      </svg>
    ),
  },
  {
    id: 'css',
    label: 'Custom CSS',
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path
          fill="currentColor"
          d="m8.7 16.3-1.4 1.4L3 13.4 7.3 9.1l1.4 1.4L5.8 13.4l2.9 2.9Zm6.6 0 2.9-2.9-2.9-2.9 1.4-1.4L21 13.4l-4.3 4.3-1.4-1.4ZM14.1 5l-4.2 14h-1.8l4.2-14h1.8Z"
        />
      </svg>
    ),
  },
];

const SECONDARY: Array<{ id: BannerStudioPane; label: string; icon: ReactNode }> = [
  {
    id: 'categories',
    label: 'Categories',
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path fill="currentColor" d="M4 6h6v6H4V6Zm10 0h6v6h-6V6ZM4 16h6v6H4v-6Zm10 0h6v6h-6v-6Z" />
      </svg>
    ),
  },
  {
    id: 'regional',
    label: 'Geo & GCM',
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm6.93 9h-3.08a15.4 15.4 0 0 0-1.16-5.02A8.03 8.03 0 0 1 18.93 11ZM12 4.07c.7 1.12 1.26 2.94 1.58 4.93H10.42C10.74 7.01 11.3 5.19 12 4.07ZM4.07 13h3.08c.16 1.8.57 3.5 1.16 5.02A8.03 8.03 0 0 1 4.07 13Zm3.08-2H4.07a8.03 8.03 0 0 1 4.24-5.02A15.4 15.4 0 0 0 7.15 11ZM12 19.93c-.7-1.12-1.26-2.94-1.58-4.93h3.16c-.32 1.99-.88 3.81-1.58 4.93ZM15.69 18.02A15.4 15.4 0 0 0 16.85 13h3.08a8.03 8.03 0 0 1-4.24 5.02Z"
        />
      </svg>
    ),
  },
  {
    id: 'policy',
    label: 'Policy',
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path fill="currentColor" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm1 7V3.5L19.5 9H15Z" />
      </svg>
    ),
  },
  {
    id: 'renewals',
    label: 'Renewals',
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path fill="currentColor" d="M12 6V3L8 7l4 4V8a4 4 0 1 1-4 4H6a6 6 0 1 0 6-6Z" />
      </svg>
    ),
  },
];

export function BannerStudio({
  pane,
  onPaneChange,
  panel,
  preview,
  canPublish,
  publishing,
  onPublish,
  onSaveDraft,
  viewport,
  onViewportChange,
  status,
  error,
}: {
  pane: BannerStudioPane;
  onPaneChange: (pane: BannerStudioPane) => void;
  panel: ReactNode;
  preview: ReactNode;
  canPublish: boolean;
  publishing: boolean;
  onPublish: () => void;
  onSaveDraft: () => void;
  viewport: 'desktop' | 'tablet' | 'mobile';
  onViewportChange: (viewport: 'desktop' | 'tablet' | 'mobile') => void;
  status?: string;
  error?: string;
}) {
  return (
    <div className="cy-banner-studio">
      <div className="cy-banner-sidebar">
        <nav className="cy-banner-rail" aria-label="Banner editor">
          {PRIMARY.map((item) => (
            <button
              key={item.id}
              type="button"
              className={pane === item.id ? 'active' : undefined}
              aria-current={pane === item.id ? 'page' : undefined}
              aria-label={item.label}
              title={item.label}
              onClick={() => onPaneChange(item.id)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
          <div className="cy-banner-rail-divider" />
          {SECONDARY.map((item) => (
            <button
              key={item.id}
              type="button"
              className={pane === item.id ? 'active' : undefined}
              aria-current={pane === item.id ? 'page' : undefined}
              aria-label={item.label}
              title={item.label}
              onClick={() => onPaneChange(item.id)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <aside className="cy-banner-panel">
          <div className="cy-banner-panel-body">{panel}</div>
          <div className="cy-banner-panel-footer">
            {error ? (
              <p className="error" role="status">
                {error}
              </p>
            ) : status ? (
              <p className="success" role="status">
                {status}
              </p>
            ) : null}
            <button
              className="cy-banner-publish"
              type="button"
              disabled={!canPublish || publishing}
              onClick={onPublish}
            >
              {publishing ? 'Publishing…' : 'Publish Changes'}
            </button>
            <button className="cy-banner-save" type="button" disabled={publishing} onClick={onSaveDraft}>
              Save draft
            </button>
          </div>
        </aside>
      </div>

      <section className="cy-banner-stage" aria-label="Banner preview">
        <div className="cy-banner-stage-toolbar">
          <div className="cy-banner-devices" role="group" aria-label="Preview size">
            {(['desktop', 'tablet', 'mobile'] as const).map((size) => (
              <button
                key={size}
                type="button"
                className={viewport === size ? 'active' : undefined}
                aria-pressed={viewport === size}
                aria-label={size}
                title={size}
                onClick={() => onViewportChange(size)}
              >
                {size === 'desktop' ? (
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                    <path fill="currentColor" d="M4 5h16v11H4V5Zm-1 13h18v2H3v-2Z" />
                  </svg>
                ) : size === 'tablet' ? (
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm6 16.25a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                    />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1 2-2Zm4 18.2a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
        <div className="cy-banner-stage-body">{preview}</div>
      </section>
    </div>
  );
}
