export const ROLES = ['CUSTOMER', 'PARTNER', 'SUPER_ADMIN'] as const;

export type Role = (typeof ROLES)[number];

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  roles: Role[];
}

export const LEGACY_ROLE_MAP: Record<string, Role> = {
  user: 'CUSTOMER',
  partner: 'PARTNER',
  admin: 'SUPER_ADMIN',
};

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && ROLES.includes(value as Role);
}
