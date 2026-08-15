import { createServerFn } from "@tanstack/react-start";
import { sanitizeNewsTitle } from "@/lib/newsText";

export type PodcastEpisode = {
  id: string;
  title: string;
  description: string;
  audioUrl: string;
  pubDate: string | null;
  durationSecs: number | null;
  imageUrl: string | null;
  link: string | null;
};

const FEED_URL = "https://feeds.captivate.fm/the-instructor/";

function tagText(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  if (!m) return "";
  return (m[1] ?? "").replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim();
}

function attr(xml: string, tag: string, name: string): string | null {
  const m = xml.match(new RegExp(`<${tag}[^>]*\\s${name}="([^"]*)"`, "i"));
  return m ? (m[1] ?? null) : null;
}

function parseDuration(raw: string): number | null {
  if (!raw) return null;
  if (/^\d+$/.test(raw)) return Number(raw);
  const parts = raw.split(":").map((p) => Number(p));
  if (parts.some((p) => Number.isNaN(p))) return null;
  return parts.reduce((acc, p) => acc * 60 + p, 0);
}

export const getPodcastEpisodes = createServerFn({ method: "GET" }).handler(
  async (): Promise<PodcastEpisode[]> => {
    try {
      const res = await fetch(FEED_URL, {
        headers: { Accept: "application/rss+xml, application/xml, text/xml" },
      });
      if (!res.ok) return [];
      const xml = await res.text();

      const channelHead = xml.slice(0, xml.indexOf("<item>"));
      const channelImage = attr(channelHead, "itunes:image", "href");

      const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];

      return items.slice(0, 20).map((item, index) => {
        const audioUrl = attr(item, "enclosure", "url") ?? "";
        const guid = tagText(item, "guid");
        const pubDateRaw = tagText(item, "pubDate");
        const pubMs = pubDateRaw ? new Date(pubDateRaw).getTime() : NaN;
        const pubDate = Number.isNaN(pubMs) ? null : new Date(pubMs).toISOString();

        return {
          id: guid || audioUrl || `episode-${index}`,
          title: sanitizeNewsTitle(tagText(item, "title")),
          description: sanitizeNewsTitle(tagText(item, "description")).slice(0, 400),
          audioUrl,
          pubDate,
          durationSecs: parseDuration(tagText(item, "itunes:duration")),
          imageUrl: attr(item, "itunes:image", "href") ?? channelImage,
          link: tagText(item, "link") || null,
        };
      });
    } catch {
      return [];
    }
  },
);
