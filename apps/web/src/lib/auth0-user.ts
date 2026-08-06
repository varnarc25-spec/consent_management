export type Auth0UserSummary = {
  sub?: string;
  name?: string;
  email?: string;
  given_name?: string;
  family_name?: string;
};

export function serializeAuth0User(
  user: Record<string, unknown> | undefined | null,
): Auth0UserSummary | null {
  if (!user) return null;
  return {
    sub: typeof user.sub === 'string' ? user.sub : undefined,
    name: typeof user.name === 'string' ? user.name : undefined,
    email: typeof user.email === 'string' ? user.email : undefined,
    given_name: typeof user.given_name === 'string' ? user.given_name : undefined,
    family_name: typeof user.family_name === 'string' ? user.family_name : undefined,
  };
}

export function displayNameFromAuth0User(user: Auth0UserSummary | null | undefined): string {
  if (!user) return 'Account';
  if (user.given_name) {
    return user.family_name ? `${user.given_name} ${user.family_name}` : user.given_name;
  }
  if (user.name?.trim()) return user.name.trim();
  if (user.email) return user.email.split('@')[0] ?? 'Account';
  return 'Account';
}
