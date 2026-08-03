const LOADING_IMAGE = '/loading-spinner.png';

export function LoadingSpinner({
  size = 'md',
  className,
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  return (
    <img
      src={LOADING_IMAGE}
      alt=""
      aria-hidden="true"
      width={80}
      height={80}
      className={`loading-spinner-img loading-spinner-img-${size}${className ? ` ${className}` : ''}`}
    />
  );
}
