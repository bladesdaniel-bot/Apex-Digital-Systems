import { describe, expect, it } from "vitest";
import { resolvePlaylist } from "@/lib/music-tracks";

describe("resolvePlaylist", () => {
  it("automatic plays spooky music in Haunted Mode and upbeat music otherwise", () => {
    expect(resolvePlaylist("auto", true)).toEqual(["haunted"]);
    expect(resolvePlaylist("auto", false)).toEqual(["synth"]);
  });
  it("haunted songs never play on the normal website", () => {
    expect(resolvePlaylist("haunted", false)).toEqual(["synth"]);
    expect(resolvePlaylist("flyer", false)).toEqual(["synth"]);
  });
  it("upbeat music never plays in Haunted Mode", () => {
    expect(resolvePlaylist("synth", true)).toEqual(["haunted"]);
  });
  it("random plays through every song for the current mode", () => {
    expect(resolvePlaylist("random", true).sort()).toEqual(["flyer", "haunted"]);
    expect(resolvePlaylist("random", false)).toEqual(["synth"]);
  });
});
