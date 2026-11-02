import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AmbientMusic } from "@/components/AmbientMusic";
import soundtrack from "@/assets/haunted-soundtrack.mp3.asset.json";

vi.mock("@/components/HauntedMode", () => ({ useHaunted: () => true }));
vi.mock("@/components/MusicChoice", () => ({ useMusicChoice: () => "auto" }));

class Recording {
  static instances: Recording[] = [];
  paused = true;
  loop = false;
  volume = 1;
  preload = "";
  constructor(public src: string) { Recording.instances.push(this); }
  play = vi.fn(async () => { this.paused = false; });
  pause = vi.fn(() => { this.paused = true; });
  removeAttribute = vi.fn();
  load = vi.fn();
}

beforeEach(() => {
  localStorage.clear();
  Recording.instances = [];
  vi.stubGlobal("Audio", Recording);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("Haunted soundtrack", () => {
  it("starts off for new visitors, plays the recording on repeat when tapped, and mutes in one click", async () => {
    render(<AmbientMusic />);
    expect(Recording.instances).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Play music" }));
    const mute = await screen.findByRole("button", { name: "Mute music" });
    const audio = Recording.instances[0];
    expect(audio?.src).toBe(soundtrack.url);
    expect(audio?.loop).toBe(true);
    fireEvent.click(mute);
    await screen.findByRole("button", { name: "Play music" });
    expect(audio?.paused).toBe(true);
    expect(localStorage.getItem("apex-music-muted")).toBe("true");
  });

  it("respects saved mute and plays only when the visitor requests it", async () => {
    localStorage.setItem("apex-music-muted", "true");
    render(<AmbientMusic />);
    expect(Recording.instances).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Play music" }));
    await waitFor(() => expect(Recording.instances[0]?.paused).toBe(false));
    expect(localStorage.getItem("apex-music-muted")).toBe("false");
  });
});