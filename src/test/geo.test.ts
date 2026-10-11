import { describe, expect, it } from "vitest";
import { locationLabel, mapsUrl, addressMapsUrl } from "@/lib/geo";

describe("locationLabel", () => {
  it("shows city and state when both are known", () => {
    expect(locationLabel({ city: "Reno", region: "Nevada", country: "United States" })).toBe("Reno, Nevada");
  });

  it("falls back to the country when city and state are missing", () => {
    expect(locationLabel({ city: "", region: "  ", country: "Spain" })).toBe("Spain");
  });

  it("is empty when nothing is known", () => {
    expect(locationLabel({})).toBe("");
  });
});

describe("mapsUrl", () => {
  it("builds a Google Maps search link that includes the country", () => {
    expect(mapsUrl({ city: "Reno", region: "Nevada", country: "United States" })).toBe(
      "https://www.google.com/maps/search/?api=1&query=Reno%2C%20Nevada%2C%20United%20States",
    );
  });

  it("returns nothing when no location is known, so no dead link is rendered", () => {
    expect(mapsUrl({ city: "", region: "", country: "" })).toBe("");
    expect(mapsUrl({})).toBe("");
  });
});

describe("addressMapsUrl", () => {
  it("links a written street address to Google Maps", () => {
    expect(addressMapsUrl("Southside Dr, YOSEMITE NATIONAL PARK, CA 95389, USA")).toBe(
      "https://www.google.com/maps/search/?api=1&query=Southside%20Dr%2C%20YOSEMITE%20NATIONAL%20PARK%2C%20CA%2095389%2C%20USA",
    );
  });

  it("returns nothing for a blank address so no dead link renders", () => {
    expect(addressMapsUrl("")).toBe("");
    expect(addressMapsUrl("   ")).toBe("");
    expect(addressMapsUrl(null)).toBe("");
    expect(addressMapsUrl(undefined)).toBe("");
  });
});
