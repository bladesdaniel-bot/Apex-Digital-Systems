import { describe, it, expect } from "vitest";
import { runCommand } from "@/components/upgrade/TerminalMode";

describe("terminal commands", () => {
  const pkgs = [{ name: "Website Launch", price: "$1,200", term: "" }];
  it("exit returns to the site", () => expect(runCommand("exit", pkgs)).toBe("exit"));
  it("services lists pricing", () => expect((runCommand("services", pkgs) as string[])[0]).toContain("$1,200"));
});
