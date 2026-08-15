import { sanitizeNewsTitle, sanitizeNewsContent } from "@/lib/newsText";

export type PodcastShow = {
  id: string;
  name: string;
  feedUrl: string;
  siteUrl: string;
  categories: string[];
  featured: boolean;
  recommended: boolean;
  recommendedNote?: string;
};

export type PodcastEpisode = {
  id: string;
  title: string;
  description: string;
  showNotes: string;
  transcriptUrl: string | null;
  transcriptType: string | null;
  audioUrl: string;
  pubDate: string | null;
  durationSecs: number | null;
  imageUrl: string | null;
  link: string | null;
  showId: string;
  showName: string;
  showFeatured: boolean;
  showRecommended: boolean;
  showCategories: string[];
};

export const PODCAST_SHOWS: PodcastShow[] = [
  {
    id: "the-instructor",
    name: "The Instructor",
    feedUrl: "https://feeds.captivate.fm/the-instructor/",
    siteUrl: "https://the-instructor.captivate.fm",
    categories: ["Teaching", "Business", "Industry", "CPD"],
    featured: true,
    recommended: true,
    recommendedNote: "The core UK instructor interview show",
  },
  {
    id: "dipod",
    name: "DIPOD",
    feedUrl: "https://rss.libsyn.com/shows/35544/destinations/89261.xml",
    siteUrl: "https://dipod.libsyn.com/",
    categories: ["Driving Instructors", "CPD", "Industry", "Teaching", "Road Safety"],
    featured: true,
    recommended: true,
    recommendedNote: "Instructor community and road safety",
  },
  {
    id: "inspire",
    name: "Inspire Instructor Training",
    feedUrl: "https://feeds.captivate.fm/instructor-training/",
    siteUrl: "https://inspireinstructortraining.com/podcast/",
    categories: ["CPD", "Teaching", "Standards Check", "Part 3", "Instructor Development"],
    featured: true,
    recommended: true,
    recommendedNote: "Part 3 and Standards Check prep",
  },
  {
    id: "vision-zero",
    name: "Driving Instructors & Vision Zero",
    feedUrl: "https://feeds.captivate.fm/driving-instructors-and/",
    siteUrl:
      "https://podcasts.apple.com/gb/podcast/driving-instructors-and-vision-zero/id1749241446",
    categories: ["Road Safety", "Driver Behaviour", "Vision Zero", "Professional Development"],
    featured: true,
    recommended: false,
  },
  {
    id: "dia-motormouth",
    name: "DIA Motormouth",
    feedUrl: "https://rss.buzzsprout.com/2123108.rss",
    siteUrl: "https://podcasts.apple.com/gb/podcast/dia-motormouth/id1880195390",
    categories: ["Industry", "Business", "Driving Instructors", "Training"],
    featured: true,
    recommended: false,
  },
  {
    id: "car-school-confessions",
    name: "Car School Confessions",
    feedUrl: "https://anchor.fm/s/dfbeeddc/podcast/rss",
    siteUrl: "https://creators.spotify.com/pod/show/carschoolconfession",
    categories: ["Instructor Life", "Learners", "Driving", "Community"],
    featured: false,
    recommended: false,
  },
  {
    id: "diary-of-a-ceo",
    name: "The Diary Of A CEO",
    feedUrl: "https://feeds.megaphone.fm/thediaryofaceo",
    siteUrl: "https://stevenbartlett.com/doac/",
    categories: ["Business", "Mindset", "Growth", "Leadership"],
    featured: false,
    recommended: true,
    recommendedNote: "Business growth and mindset for running your school",
  },
];

function tagText(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  if (!m) return "";
  return (m[1] ?? "").replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim();
}

function attr(xml: string, tag: string, name: string): string | null {
  const m = xml.match(new RegExp(`<${tag}[^>]*\\s${name}="([^"]*)"`, "i"));
  return m ? (m[1] ?? null) : null;
}

function transcriptTag(item: string): { url: string; type: string } | null {
  const tags = item.match(/<podcast:transcript[^>]*\/?>/gi) ?? [];
  const parsed = tags
    .map((t) => {
      const url = t.match(/\surl="([^"]*)"/i)?.[1] ?? "";
      const type = (t.match(/\stype="([^"]*)"/i)?.[1] ?? "").toLowerCase();
      return { url, type };
    })
    .filter((t) => !!t.url);
  if (parsed.length === 0) return null;
  const rank = (type: string) =>
    type.includes("json") ? 0 : type.includes("vtt") ? 1 : type.includes("srt") ? 2 : 3;
  return parsed.sort((a, b) => rank(a.type) - rank(b.type))[0] ?? null;
}

function parseDuration(raw: string): number | null {
  if (!raw) return null;
  if (/^\d+$/.test(raw)) return Number(raw);
  const parts = raw.split(":").map((p) => Number(p));
  if (parts.some((p) => Number.isNaN(p))) return null;
  return parts.reduce((acc, p) => acc * 60 + p, 0);
}

export function parseFeed(xml: string, show: PodcastShow, limit: number): PodcastEpisode[] {
  const firstItem = xml.indexOf("<item");
  const channelHead = firstItem > 0 ? xml.slice(0, firstItem) : xml;
  const channelImage =
    attr(channelHead, "itunes:image", "href") || tagText(channelHead, "url") || null;

  const items = xml.match(/<item[\s\S]*?<\/item>/g) ?? [];

  return items.slice(0, limit).map((item, index) => {
    const audioUrl = attr(item, "enclosure", "url") ?? "";
    const guid = tagText(item, "guid");
    const pubDateRaw = tagText(item, "pubDate");
    const pubMs = pubDateRaw ? new Date(pubDateRaw).getTime() : NaN;
    const pubDate = Number.isNaN(pubMs) ? null : new Date(pubMs).toISOString();
    const transcript = transcriptTag(item);
    const notesRaw = tagText(item, "content:encoded") || tagText(item, "description");

    return {
      id: `${show.id}:${guid || audioUrl || `episode-${index}`}`,
      title: sanitizeNewsTitle(tagText(item, "title")),
      description: sanitizeNewsTitle(tagText(item, "description")).slice(0, 400),
      showNotes: sanitizeNewsContent(notesRaw).slice(0, 6000),
      transcriptUrl: transcript?.url ?? null,
      transcriptType: transcript?.type ?? null,
      audioUrl,
      pubDate,
      durationSecs: parseDuration(tagText(item, "itunes:duration")),
      imageUrl: attr(item, "itunes:image", "href") ?? channelImage,
      link: tagText(item, "link") || show.siteUrl,
      showId: show.id,
      showName: show.name,
      showFeatured: show.featured,
      showRecommended: show.recommended,
      showCategories: show.categories,
    };
  });
}

export async function fetchAllEpisodes(): Promise<PodcastEpisode[]> {
  const results = await Promise.allSettled(
    PODCAST_SHOWS.map(async (show) => {
      const res = await fetch(show.feedUrl, {
        headers: { Accept: "application/rss+xml, application/xml, text/xml" },
      });
      if (!res.ok) return [] as PodcastEpisode[];
      return parseFeed(await res.text(), show, 10);
    }),
  );

  return results
    .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
    .sort((a, b) => (b.pubDate ?? "").localeCompare(a.pubDate ?? ""))
    .slice(0, 60);
}

export async function fetchTranscriptText(url: string, type: string | null): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Transcript unavailable (${res.status})`);
  const raw = await res.text();

  if ((type ?? "").includes("json") || raw.trim().startsWith("{")) {
    try {
      const data = JSON.parse(raw);
      const segments: any[] = Array.isArray(data?.segments) ? data.segments : [];
      if (segments.length > 0) {
        let out = "";
        let speaker: string | null = null;
        for (const seg of segments) {
          const body = String(seg?.body ?? "").trim();
          if (!body) continue;
          const spk = seg?.speaker ? String(seg.speaker) : null;
          if (spk && spk !== speaker) {
            speaker = spk;
            out += `\n\n${spk}: `;
          } else if (out && !out.endsWith(" ") && !out.endsWith(": ")) {
            out += " ";
          }
          out += body;
        }
        return out.trim();
      }
    } catch {
      /* fall through to plain text handling */
    }
  }

  // VTT / SRT / plain text
  return raw
    .replace(/^WEBVTT.*$/gim, "")
    .replace(/^\d+$/gm, "")
    .replace(/^.*-->.*$/gm, "")
    .replace(/<[^>]*>/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
