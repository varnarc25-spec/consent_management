import { LoadingSpinner } from '@/components/loading-spinner';

export function InlineLoading() {
  return (
    <div className="loading-inline" role="status" aria-label="Loading">
      <LoadingSpinner size="md" />
    </div>
  );
}

export function LoadingScreen({
  message,
  inline = false,
}: {
  message?: string;
  inline?: boolean;
}) {
  return (
    <div
      className={inline ? 'loading-screen loading-screen-inline' : 'loading-screen'}
      role="status"
      aria-live="polite"
      aria-label={message ?? 'Loading'}
    >
      <div className="loading-screen-content">
        <LoadingSpinner size="lg" />
        {message ? <p>{message}</p> : null}
      </div>
    </div>
  );
}
