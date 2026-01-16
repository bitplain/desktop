export function isInviteExpired(createdAt: Date, hours: number) {
  const expiresAt = new Date(createdAt.getTime() + hours * 60 * 60 * 1000);
  return Date.now() > expiresAt.getTime();
}
