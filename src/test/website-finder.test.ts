import { describe, expect, it } from "vitest";
import { pageMatchesBusiness } from "@/lib/website-finder.server";

describe("website finder only accepts pages that belong to the business", () => {
  it("accepts a page showing the business phone number", () => {
    expect(pageMatchesBusiness("<p>Call (775) 555-1234 today</p>", "Acme Plumbing", "(775) 555-1234")).toBe(true);
  });
  it("accepts a page with the business name", () => {
    expect(pageMatchesBusiness("<h1>Reno Rooter Plumbing</h1>", "Reno Rooter Plumbing", "")).toBe(true);
  });
  it("rejects an unrelated page", () => {
    expect(pageMatchesBusiness("<h1>Best Pizza in Town</h1>", "Reno Rooter Plumbing", "(775) 555-1234")).toBe(false);
  });
});
