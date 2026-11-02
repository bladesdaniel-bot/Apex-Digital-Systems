import { useQuery } from "@tanstack/react-query";
import { getMusicChoice } from "@/lib/music.functions";
import type { MusicChoice } from "@/lib/music-tracks";

export const musicQuery = { queryKey: ["music-choice"], queryFn: () => getMusicChoice(), staleTime: 60_000 };

export function useMusicChoice(): MusicChoice | undefined {
  return useQuery(musicQuery).data?.choice;
}
