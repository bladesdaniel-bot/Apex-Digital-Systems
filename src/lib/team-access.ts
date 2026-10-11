export type TeamRole = "admin" | "telemarketer" | "pending" | "suspended" | "revoked";

/** Roles allowed to use the AI lead brief generator and other team tools. */
export const BRIEF_ROLES: TeamRole[] = ["admin", "telemarketer"];
export const canUseBrief = (role: TeamRole | null) => role !== null && BRIEF_ROLES.includes(role);
export const canUseTerminal = (role: TeamRole | null) => role === "admin" || role === "telemarketer";

/**
 * Roles an admin may set for someone else. "admin" is deliberately absent so
 * ownership can never be handed out from the team page.
 */
export const ASSIGNABLE_ROLES = ["telemarketer", "pending", "suspended", "revoked"] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];
