import { createServerFn } from "@tanstack/react-start";
import { fetchAllEpisodes, type PodcastEpisode } from "@/lib/podcasts";

export type { PodcastEpisode } from "@/lib/podcasts";

export const getPodcastEpisodes = createServerFn({ method: "GET" }).handler(
  async (): Promise<PodcastEpisode[]> => {
    try {
      return await fetchAllEpisodes();
    } catch {
      return [];
    }
  },
);
