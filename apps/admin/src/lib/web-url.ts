export function getWebUrl(): string {
  return (
    process.env.NEXT_PUBLIC_WEB_URL?.replace(/\/$/, '') ||
    process.env.WEB_URL?.replace(/\/$/, '') ||
    'http://localhost:3000'
  );
}
