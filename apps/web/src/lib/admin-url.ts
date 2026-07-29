export function getAdminUrl(): string {
  return (
    process.env.NEXT_PUBLIC_ADMIN_URL?.replace(/\/$/, '') ||
    process.env.ADMIN_URL?.replace(/\/$/, '') ||
    'http://localhost:3001'
  );
}
