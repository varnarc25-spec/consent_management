const STATUS_CLASS: Record<string, string> = {
  running: 'status-badge-running',
  completed: 'status-badge-completed',
  failed: 'status-badge-failed',
  cancelled: 'status-badge-cancelled',
  pending: 'status-badge-pending',
};

export function ScanStatusBadge({ status }: { status: string }) {
  const key = status.toLowerCase();
  const className = STATUS_CLASS[key] ?? 'status-badge-pending';
  const label =
    status === 'RUNNING'
      ? 'Running'
      : status === 'COMPLETED'
        ? 'Completed'
        : status === 'FAILED'
          ? 'Failed'
          : status === 'CANCELLED'
            ? 'Cancelled'
            : status === 'PENDING'
              ? 'Pending'
              : status;

  return (
    <span className={`status-badge ${className}`}>
      <span className="status-badge-dot" aria-hidden="true" />
      {label}
    </span>
  );
}
