import { createServerFn } from "@tanstack/react-start";
import { fetchAllEpisodes, fetchTranscriptText, type PodcastEpisode } from "@/lib/podcasts";

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

export const getPodcastTranscript = createServerFn({ method: "GET" })
  .inputValidator((data: { url: string; type?: string | null }) => {
    const url = String(data?.url ?? "");
    if (!/^https:\/\//i.test(url)) throw new Error("Invalid transcript URL");
    return { url, type: data?.type ?? null };
  })
  .handler(async ({ data }): Promise<{ text: string; error: string | null }> => {
    try {
      return { text: await fetchTranscriptText(data.url, data.type), error: null };
    } catch (e) {
      return { text: "", error: e instanceof Error ? e.message : "Transcript unavailable" };
    }
  });
