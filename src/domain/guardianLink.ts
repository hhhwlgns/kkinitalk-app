import type { GuardianLink } from './types';

export function findConnectedLink(links: GuardianLink[], guardianUserId: string): GuardianLink | null {
  return links.find((link) => link.guardianUserId === guardianUserId && link.status === 'connected') ?? null;
}

export function findLinkByInviteCode(links: GuardianLink[], inviteCode: string): GuardianLink | null {
  const normalized = inviteCode.trim().toUpperCase();
  return links.find((link) => link.inviteCode === normalized && link.status === 'pending') ?? null;
}
