// Browser-safe list of website soundtracks the owner can choose from.
export const MUSIC_CHOICES = ["auto", "synth", "haunted", "flyer", "random"] as const;
export type MusicChoice = (typeof MUSIC_CHOICES)[number];
export type MusicTrack = "synth" | "haunted" | "flyer";

export const MUSIC_LABELS: Record<MusicChoice, string> = {
  auto: "Automatic (spooky music in Haunted Mode, upbeat music otherwise)",
  synth: "Upbeat Apex music (normal website)",
  haunted: "Haunted soundtrack (Haunted Mode only)",
  flyer: "Halloween Hiring Flyer song (Haunted Mode only)",
  random: "Random (plays through every song for the current mode)",
};

/** Songs that belong to each website mode. Add new songs to the right list. */
export const NORMAL_TRACKS: MusicTrack[] = ["synth"];
export const HAUNTED_TRACKS: MusicTrack[] = ["haunted", "flyer"];

function shuffle<T>(list: T[], rand: () => number): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1)) % (i + 1);
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** The ordered songs a visitor hears; more than one means play them back to back on repeat. */
export function resolvePlaylist(choice: MusicChoice, haunted: boolean, rand: () => number = Math.random): MusicTrack[] {
  const pool = haunted ? HAUNTED_TRACKS : NORMAL_TRACKS;
  if (choice === "random") return shuffle(pool, rand);
  if (choice !== "auto" && pool.includes(choice)) return [choice];
  return [pool[0]!];
}

export function isMusicChoice(v: unknown): v is MusicChoice {
  return typeof v === "string" && (MUSIC_CHOICES as readonly string[]).includes(v);
}
