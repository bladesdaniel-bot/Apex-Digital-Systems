import { describe, it, expect } from "vitest";
import { parseServices, matchOption } from "@/lib/voice-form";
const opts = ["Website Launch", "Talking Website Agent", "Custom App Design & Build", "Not sure yet"];
describe("voice form", () => {
  it("parses comma-separated services", () => {
    expect(parseServices("talking website agent, Custom App Design & Build ,bogus", opts)).toEqual(["Talking Website Agent", "Custom App Design & Build"]);
  });
  it("matches budget with dash variants", () => {
    expect(matchOption("$500 - $1,500", ["Under $500", "$500 – $1,500"])).toBe("$500 – $1,500");
  });
});
