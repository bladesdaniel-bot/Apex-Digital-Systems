import { describe, it, expect } from "vitest";
import { ASSIGNABLE_ROLES, canUseBrief, canUseTerminal } from "@/lib/team-access";

describe("lead brief access", () => {
  it("admins and telemarketers can use the brief tool", () => {
    expect(canUseBrief("admin")).toBe(true);
    expect(canUseBrief("telemarketer")).toBe(true);
  });
  it("pending, on hold and revoked members cannot", () => {
    expect(canUseBrief("pending")).toBe(false);
    expect(canUseBrief("suspended")).toBe(false);
    expect(canUseBrief("revoked")).toBe(false);
    expect(canUseBrief(null)).toBe(false);
  });
  it("admins can put a member on hold or revoke them, but never grant admin", () => {
    expect(ASSIGNABLE_ROLES).toContain("suspended");
    expect(ASSIGNABLE_ROLES).toContain("revoked");
    expect(ASSIGNABLE_ROLES).not.toContain("admin");
  });
});

describe("Terminal access", () => {
  it("allows the owner admin", () => expect(canUseTerminal("admin")).toBe(true));
  it("allows approved team members", () => expect(canUseTerminal("telemarketer")).toBe(true));
  it("denies public visitors", () => expect(canUseTerminal(null)).toBe(false));
  it("denies pending members", () => expect(canUseTerminal("pending")).toBe(false));
  it("denies members on hold", () => expect(canUseTerminal("suspended")).toBe(false));
  it("denies revoked members", () => expect(canUseTerminal("revoked")).toBe(false));
});

