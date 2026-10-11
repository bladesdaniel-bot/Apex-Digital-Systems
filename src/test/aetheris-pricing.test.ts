import { describe, expect, it } from "vitest";
import { aetherisAssets } from "@/components/AetherisConcept";

describe("Fictional concepts are not priced for sale", () => {
  it.each(["Neural Mapping API", "Quantum Data Vault", "Swarm Logic Engine"])("does not assign a sale price to %s", name => {
    const asset = aetherisAssets.find(asset => asset.name === name);
    expect(asset).toBeDefined();
    expect(asset).not.toHaveProperty("price");
  });
});