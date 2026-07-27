import type { PrivacyTriggerConfig } from './types';

const TRIGGER_STYLE = `
.cmp-privacy-trigger{position:fixed;z-index:2147483645;border:0;border-radius:999px;padding:.75rem 1rem;font-size:.8125rem;font-weight:600;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.15);background:#111827;color:#fff}
.cmp-privacy-trigger:focus-visible{outline:2px solid #2563eb;outline-offset:2px}
.cmp-privacy-trigger-bottom-right{bottom:1rem;right:1rem}
.cmp-privacy-trigger-bottom-left{bottom:1rem;left:1rem}
.cmp-privacy-footer-link{color:inherit;text-decoration:underline;cursor:pointer;background:none;border:0;padding:0;font:inherit}
`;

export interface PrivacyTriggerHandle {
  destroy: () => void;
}

export function mountPrivacyTrigger(
  config: PrivacyTriggerConfig | undefined,
  onOpen: () => void,
): PrivacyTriggerHandle | null {
  if (!config?.enabled || config.mode === 'api_only' || typeof document === 'undefined') {
    bindCustomTriggers(onOpen);
    return null;
  }

  const style = document.createElement('style');
  style.textContent = TRIGGER_STYLE;
  document.head.appendChild(style);

  let footerLink: HTMLButtonElement | null = null;
  let floatingButton: HTMLButtonElement | null = null;

  if (config.mode === 'footer_link' && config.footerSelector) {
    const target = document.querySelector(config.footerSelector);
    if (target) {
      footerLink = document.createElement('button');
      footerLink.type = 'button';
      footerLink.className = 'cmp-privacy-footer-link';
      footerLink.textContent = config.label ?? 'Privacy settings';
      footerLink.setAttribute('data-cmp-privacy-trigger', 'true');
      footerLink.addEventListener('click', onOpen);
      target.appendChild(footerLink);
    }
  }

  if (config.mode === 'floating_icon' || (config.mode === 'footer_link' && !footerLink)) {
    floatingButton = document.createElement('button');
    floatingButton.type = 'button';
    floatingButton.className = `cmp-privacy-trigger cmp-privacy-trigger-${config.position ?? 'bottom-right'}`;
    floatingButton.setAttribute('aria-label', config.label ?? 'Privacy settings');
    floatingButton.setAttribute('data-cmp-privacy-trigger', 'true');
    floatingButton.textContent = config.label ?? 'Privacy settings';
    floatingButton.addEventListener('click', onOpen);
    document.body.appendChild(floatingButton);
  }

  const unbindCustom = bindCustomTriggers(onOpen);

  return {
    destroy: () => {
      style.remove();
      footerLink?.remove();
      floatingButton?.remove();
      unbindCustom();
    },
  };
}

function bindCustomTriggers(onOpen: () => void) {
  const elements = Array.from(document.querySelectorAll('[data-cmp-open]'));
  const handler = (event: Event) => {
    event.preventDefault();
    onOpen();
  };
  elements.forEach((element) => element.addEventListener('click', handler));
  return () => elements.forEach((element) => element.removeEventListener('click', handler));
}
