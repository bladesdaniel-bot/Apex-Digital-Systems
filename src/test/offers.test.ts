import { describe, expect, it } from "vitest";
import { interestOptions, packages, services } from "@/lib/offers";
import { QUOTE_PACKAGES } from "@/lib/quote";
import { runCommand } from "@/components/upgrade/TerminalMode";

describe("Custom App Design & Build offering", () => {
  const app = packages.find(p => p.name === "Custom App Design & Build");

  it("is a pricing card that shows no public starting price", () => {
    expect(app).toBeDefined();
    expect(app?.price).toBe("");
    expect(app?.custom).toBe(true);
    expect(app?.cadence).toBe("Per project");
  });

  it("is offered in the analysis form's service checkboxes", () => {
    expect(interestOptions).toContain("Custom App Design & Build");
  });

  it("has its own card in the services grid", () => {
    expect(services.map(s => s.key)).toContain("Custom Apps & Software");
  });

  it("can be quoted by the team", () => {
    expect(QUOTE_PACKAGES.map(p => p.name)).toContain("Custom App Design & Build");
  });

  it("shows as a custom quote in the terminal instead of a blank price", () => {
    const line = (runCommand("services", packages) as string[]).find(l => l.includes("Custom App Design"));
    expect(line).toContain("custom quote");
    expect(line).not.toContain("from $");
  });
});

describe("Website Launch & Redesign pricing", () => {
  // Dropped from $1,200 on the owner's instruction.
  it("advertises both website packages at $1,000", () => {
    expect(packages.find(p => p.name === "Website Launch")?.price).toBe("$1,000");
    expect(packages.find(p => p.name === "Website Redesign")?.price).toBe("$1,000");
  });

  it("quotes the same $1,000 the home page advertises", () => {
    expect(QUOTE_PACKAGES.find(p => p.name === "Website Launch")?.price).toBe(1000);
    expect(QUOTE_PACKAGES.find(p => p.name === "Website Redesign")?.price).toBe(1000);
  });

  it("leaves every other package price alone", () => {
    expect(packages.find(p => p.name === "SEO Growth Cleanup")?.price).toBe("$399");
    expect(packages.find(p => p.name === "Website Care Plan")?.price).toBe("$125");
    expect(packages.find(p => p.name === "Website Growth & Maintenance")?.price).toBe("$250");
  });
});

import { flyerPriceRows } from "@/lib/offers";
describe("animated flyer price rows", () => {
  it("advertise exactly the prices the pricing cards show", () => {
    expect(flyerPriceRows).toEqual([
      { label: "Website Launch", price: "$1,000" },
      { label: "Website Redesign", price: "$1,000" },
      { label: "SEO Growth Cleanup", price: "$399" },
      { label: "Care Plan", price: "$125/mo" },
      { label: "Growth Plan", price: "$250/mo" },
      { label: "Custom Software", price: "Custom quote" },
    ]);
  });

  it("never carry the retired $1,200 website price", () => {
    expect(flyerPriceRows.some((r) => /1[,.]?200/.test(r.price))).toBe(false);
  });

  it("list no social media offering", () => {
    expect(flyerPriceRows.some((r) => /social/i.test(`${r.label} ${r.price}`))).toBe(false);
  });
});
