import Image from 'next/image';

type CmpLogoProps = {
  size?: number;
  className?: string;
  label?: string;
};

export function CmpLogo({ size = 28, className, label = 'CMP' }: CmpLogoProps) {
  return (
    <span className={`cmp-logo${className ? ` ${className}` : ''}`}>
      <Image
        src="/icon-32.png"
        alt=""
        width={size}
        height={size}
        className="cmp-logo-mark"
        priority
      />
      <span className="cmp-logo-text">{label}</span>
    </span>
  );
}
