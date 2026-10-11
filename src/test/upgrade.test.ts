import { describe, it, expect } from "vitest";
import { projectedLeads } from "@/components/upgrade/RevenueEngine";
import { runCommand } from "@/components/upgrade/TerminalMode";

describe("revenue engine", () => {
  it("projects leads at a 4.5% conversion rate", () => {
    expect(projectedLeads(2000)).toBe(90);
    expect(projectedLeads(10000)).toBe(450);
  });
});

describe("terminal commands", () => {
  const pkgs = [{ name: "Website Launch", price: "$1,200", term: "" }];
  it("exit returns to the site", () => expect(runCommand("exit", pkgs)).toBe("exit"));
  it("services lists pricing", () => expect((runCommand("services", pkgs) as string[])[0]).toContain("$1,200"));
});
