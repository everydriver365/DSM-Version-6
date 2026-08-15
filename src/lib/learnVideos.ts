/**
 * DSM Learn → Videos.
 *
 * One content record per video: rows live in the existing `learn_videos` table
 * (`kind = 'library'`), so the same row powers Learn → Videos, Bitesize and the
 * recommendation engine without duplication.
 *
 * Nothing is re-hosted — every third-party video is an official URL played
 * through its official embed, with the source name kept on the card.
 */

export type VideoAudience = "instructor" | "pupil" | "both";

export interface LearnVideo {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  embed_url?: string | null;
  thumbnail_url: string | null;
  duration?: string | number | null;
  duration_seconds?: number | null;
  sort_order?: number | null;
  kind?: string | null;
  source?: string | null;
  source_url?: string | null;
  categories?: string[] | null;
  topics?: string[] | null;
  audience?: VideoAudience | string | null;
  is_bitesize?: boolean | null;
  bitesize_category?: string | null;
  is_featured?: boolean | null;
  is_published?: boolean | null;
  related_podcast_slug?: string | null;
  related_learn_item_id?: string | null;
  revision_topic?: string | null;
}

export const VIDEO_CATEGORIES = [
  "Driving",
  "Instructor",
  "CPD",
  "Road Safety",
  "Learner Teaching",
  "Hazard Perception",
  "Manoeuvres",
  "Roundabouts & Junctions",
  "Test Preparation",
  "Psychology & Behaviour",
  "Technology & AI",
  "EV & Vehicles",
] as const;

export type VideoCategory = (typeof VIDEO_CATEGORIES)[number];

export const VIDEO_CATEGORY_EMOJI: Record<string, string> = {
  Driving: "🚗",
  Instructor: "👨‍🏫",
  CPD: "🎓",
  "Road Safety": "🚦",
  "Learner Teaching": "🧑‍🎓",
  "Hazard Perception": "🛣️",
  Manoeuvres: "🔄",
  "Roundabouts & Junctions": "🚘",
  "Test Preparation": "🏁",
  "Psychology & Behaviour": "🧠",
  "Technology & AI": "🤖",
  "EV & Vehicles": "⚡",
};

export const BITESIZE_CATEGORIES = [
  "Driving Tip",
  "Instructor Tip",
  "CPD",
  "Psychology",
  "Business",
  "Road Safety",
  "AI & Technology",
  "Wellbeing",
] as const;

export const BITESIZE_CATEGORY_EMOJI: Record<string, string> = {
  "Driving Tip": "🚗",
  "Instructor Tip": "👨‍🏫",
  CPD: "🎓",
  Psychology: "🧠",
  Business: "💼",
  "Road Safety": "🚦",
  "AI & Technology": "🤖",
  Wellbeing: "🌿",
};

export const AUDIENCE_LABEL: Record<string, string> = {
  instructor: "👨‍🏫 Instructor",
  pupil: "🧑‍🎓 Pupil",
  both: "👥 Both",
};

const YT_RE =
  /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

export function youtubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(YT_RE);
  return m ? m[1] : null;
}

/** Official YouTube embed — standard controls and branding left intact. */
export function youtubeEmbedUrl(url: string | null | undefined): string | null {
  const id = youtubeId(url);
  return id ? `https://www.youtube.com/embed/${id}?autoplay=1&rel=0` : null;
}

export function videoThumbnail(v: LearnVideo): string | null {
  if (v.thumbnail_url) return v.thumbnail_url;
  const id = youtubeId(v.url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

/** Playable source inside DSM: an official embed URL, else the file URL. */
export function videoEmbed(v: LearnVideo): { type: "embed" | "file"; src: string } | null {
  if (v.embed_url) return { type: "embed", src: v.embed_url };
  const yt = youtubeEmbedUrl(v.url);
  if (yt) return { type: "embed", src: yt };
  if (v.url) return { type: "file", src: v.url };
  return null;
}

export function videoMinutes(v: LearnVideo): number | null {
  if (v.duration_seconds != null) return Math.max(1, Math.round(v.duration_seconds / 60));
  const raw = v.duration;
  if (raw == null) return null;
  const s = String(raw).trim();
  if (/^\d+:\d{2}$/.test(s)) {
    const [m, sec] = s.split(":").map(Number);
    return Math.max(1, Math.round(m + sec / 60));
  }
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

export function formatVideoDuration(v: LearnVideo): string {
  const m = videoMinutes(v);
  return m == null ? "" : `${m} min`;
}

/** Bitesize = roughly 1–15 minutes, with 5–10 minutes preferred. */
export function isBitesizeLength(v: LearnVideo): boolean {
  const m = videoMinutes(v);
  return m != null && m >= 1 && m <= 15;
}

export function bitesizeRank(v: LearnVideo): number {
  const m = videoMinutes(v) ?? 99;
  if (m >= 5 && m <= 10) return 0;
  if (m <= 15) return 1;
  return 2;
}

export function searchVideos(videos: LearnVideo[], query: string): LearnVideo[] {
  const q = query.trim().toLowerCase();
  if (!q) return videos;
  const terms = q.split(/\s+/);
  return videos.filter((v) => {
    const hay = [
      v.title,
      v.description ?? "",
      v.source ?? "",
      (v.categories ?? []).join(" "),
      (v.topics ?? []).join(" "),
      v.bitesize_category ?? "",
    ]
      .join(" ")
      .toLowerCase();
    return terms.every((t) => hay.includes(t));
  });
}

/** Row shape shared by the DB and the client filters. */
export const LEARN_VIDEO_COLUMNS = "*";

export function isLibraryVideo(v: LearnVideo): boolean {
  return (v.kind ?? "howto") === "library";
}

export function isHowToVideo(v: LearnVideo): boolean {
  return (v.kind ?? "howto") === "howto";
}

export function isPublished(v: LearnVideo): boolean {
  return v.is_published !== false;
}
