import { describe, expect, it } from "vitest";
import { interestOptions, packages, services } from "@/lib/offers";
import { QUOTE_MEMBERSHIPS, QUOTE_PACKAGES } from "@/lib/quote";
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

  it("stays listed in the shared services data", () => {
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

describe("package prices from the pricing guide", () => {
  it.each([
    ["Starter Site", 1000], ["Business Site", 1750], ["Complete Online Store Package", 2500],
    ["Website Redesign", 750], ["SEO Growth Cleanup", 399],
    ["Talking Website Starter (setup)", 500], ["Talking Website Standard (setup)", 750],
    ["Talking Website Premium (setup)", 1000],
  ])("defaults %s to the uploaded PDF's $%s in Build Order", (name, amount) => {
    expect(QUOTE_PACKAGES.find(p => p.name === name)?.price).toBe(amount);
  });
  it.each([
    ["Website Care Plan", 125], ["Growth and Maintenance", 250],
    ["Talking Website Starter", 199], ["Talking Website Standard", 279], ["Talking Website Premium", 349],
  ])("defaults %s to $%s monthly in Build Order", (name, amount) => {
    expect(QUOTE_MEMBERSHIPS.find(p => p.name === name)?.price).toBe(amount);
  });
  it("keeps the store at a flat price and redesign as a starting price", () => {
    expect(QUOTE_PACKAGES.find(p => p.name === "Complete Online Store Package")?.from).toBeFalsy();
    expect(QUOTE_PACKAGES.find(p => p.name === "Website Redesign")?.from).toBe(true);
  });
  const price = (n: string) => packages.find(p => p.name === n)?.price;
  it("advertises each package at the guide price", () => {
    expect(price("Starter Site")).toBe("$1,000");
    expect(price("Business Site")).toBe("$1,750");
    expect(price("Complete Online Store Package")).toBe("$2,500");
    expect(price("Website Redesign")).toBe("$750");
    expect(price("SEO Growth Cleanup")).toBe("$399");
    expect(price("Website Care Plan")).toBe("$125");
    expect(price("Growth and Maintenance")).toBe("$250");
  });
  it("lists talking website setup and monthly fees", () => {
    expect(packages.find(p => p.name === "Talking Website Starter")).toMatchObject({ price: "$500", sub: "+ $199/mo" });
    expect(packages.find(p => p.name === "Talking Website Standard")).toMatchObject({ price: "$750", sub: "+ $279/mo" });
    expect(packages.find(p => p.name === "Talking Website Premium")).toMatchObject({ price: "$1,000", sub: "+ $349/mo" });
  });
  it("order builder quotes the same prices", () => {
    const q = (n: string) => QUOTE_PACKAGES.find(p => p.name === n)?.price;
    expect(q("Starter Site")).toBe(1000);
    expect(q("Business Site")).toBe(1750);
    expect(q("Complete Online Store Package")).toBe(2500);
    expect(q("Website Redesign")).toBe(750);
    expect(q("Talking Website Premium (setup)")).toBe(1000);
    expect(QUOTE_MEMBERSHIPS.map(m => m.price)).toEqual([125, 250, 199, 279, 349, 150]);
  });
});

describe("customer form interest options", () => {
  it("offers the option under its full name", () => {
    expect(interestOptions).toContain("Talking Website Agent");
  });

  it("never shows the old short name", () => {
    expect(interestOptions).not.toContain("Talking Website");
  });
});

import { flyerPriceRows } from "@/lib/offers";
describe("animated flyer price rows", () => {
  it("advertise exactly the prices the pricing cards show", () => {
    expect(flyerPriceRows).toEqual([
      { label: "Starter Site", price: "$1,000" },
      { label: "Business Site", price: "$1,750" },
      { label: "Redesign", price: "from $750" },
      { label: "Care Plan", price: "$125/mo" },
      { label: "Growth Plan", price: "$250/mo" },
      { label: "SEO Cleanup", price: "$399" },
    ]);
  });

  it("never carry the retired $1,200 website price", () => {
    expect(flyerPriceRows.some((r) => /1[,.]?200/.test(r.price))).toBe(false);
  });

  it("list no social media offering", () => {
    expect(flyerPriceRows.some((r) => /social/i.test(`${r.label} ${r.price}`))).toBe(false);
  });
});
