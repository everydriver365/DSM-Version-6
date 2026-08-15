import { createFileRoute } from "@tanstack/react-router";
import {
  classifyCategory,
  dedupeKey,
  detectImportance,
  isRoadAlertContent,
  type NewsCategoryKey,
} from "@/lib/newsCategories";

export const Route = createFileRoute("/api/public/news-ingest")({
  server: {
    handlers: {
      POST: async ({ request }) => runIngest(request),
      GET: async ({ request }) => runIngest(request),
    },
  },
});

const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";

type SourceRow = {
  id: string;
  name: string;
  url: string;
  feed_url: string | null;
  kind: string;
  tier: number;
  default_category: string;
  requires_approval: boolean;
  enabled: boolean;
  priority: number;
};

function strip(html: string): string {
  return html
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function tag(block: string, name: string): string {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m?.[1] ? strip(m[1]) : "";
}

function linkOf(block: string): string {
  const href = block.match(/<link[^>]*href="([^"]+)"/i);
  if (href?.[1]) return href[1];
  return tag(block, "link");
}

function imageOf(block: string): string | null {
  const enclosure = block.match(/<enclosure[^>]*url="([^"]+)"[^>]*>/i);
  if (enclosure?.[1]) return enclosure[1];
  const media = block.match(/<media:(?:content|thumbnail)[^>]*url="([^"]+)"/i);
  if (media?.[1]) return media[1];
  const img = block.match(/<img[^>]*src="([^"]+)"/i);
  return img?.[1] ?? null;
}

type ParsedItem = {
  title: string;
  summary: string;
  link: string;
  image_url: string | null;
  published_at: string | null;
};

function parseFeed(xml: string, limit: number): ParsedItem[] {
  const blocks = xml.match(/<(item|entry)[\s\S]*?<\/(item|entry)>/gi) ?? [];
  const items: ParsedItem[] = [];
  for (const block of blocks.slice(0, limit)) {
    const title = tag(block, "title");
    if (!title) continue;
    const rawDate =
      tag(block, "pubDate") || tag(block, "updated") || tag(block, "published") || "";
    const parsed = rawDate ? new Date(rawDate) : null;
    items.push({
      title,
      summary: (tag(block, "description") || tag(block, "summary") || tag(block, "content")).slice(0, 400),
      link: linkOf(block),
      image_url: imageOf(block),
      published_at: parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : null,
    });
  }
  return items;
}

async function runIngest(request: Request): Promise<Response> {
  const secret = process.env["NEWS_INGEST_SECRET"];
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];

  if (!secret || !serviceKey) {
    return Response.json(
      { error: "News ingest is not configured (NEWS_INGEST_SECRET / SUPABASE_SERVICE_ROLE_KEY missing)" },
      { status: 503 },
    );
  }

  const provided =
    request.headers.get("x-ingest-secret") ??
    new URL(request.url).searchParams.get("secret") ??
    "";
  if (provided !== secret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const rest = async (path: string, init?: RequestInit) => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      ...init,
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation",
        ...(init?.headers ?? {}),
      },
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`${res.status} ${text}`);
    return text ? JSON.parse(text) : null;
  };

  const sources: SourceRow[] = (await rest(
    "news_sources?enabled=eq.true&kind=neq.social&order=priority.asc",
  )) ?? [];

  const seen = new Map<string, { tier: number; sources: string[] }>();
  const rows: Record<string, unknown>[] = [];
  const errors: { source: string; error: string }[] = [];

  await Promise.all(
    sources.map(async (source) => {
      const feed = source.feed_url;
      if (!feed) return;
      try {
        const res = await fetch(feed, {
          headers: { "User-Agent": "DSM-News/1.0", Accept: "application/rss+xml, application/atom+xml, text/xml" },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const xml = await res.text();
        for (const item of parseFeed(xml, 15)) {
          const blob = `${item.title} ${item.summary}`;
          // Live incidents belong to Road Alerts, not News.
          if (isRoadAlertContent(blob)) continue;

          const key = dedupeKey(item.title);
          const existing = seen.get(key);
          if (existing) {
            if (!existing.sources.includes(source.name)) existing.sources.push(source.name);
            continue;
          }
          seen.set(key, { tier: source.tier, sources: [source.name] });

          const category: NewsCategoryKey = classifyCategory(
            blob,
            source.default_category as NewsCategoryKey,
          );
          rows.push({
            title: item.title,
            description: item.summary,
            summary: item.summary,
            link: item.link,
            image_url: item.image_url,
            published_at: item.published_at ?? new Date().toISOString(),
            source: source.name,
            source_id: source.id,
            tier: source.tier,
            category,
            importance: detectImportance(blob, source.tier),
            dedupe_key: key,
            status: source.requires_approval ? "pending" : "approved",
            is_hidden: false,
          });
        }
      } catch (err) {
        errors.push({ source: source.name, error: String(err) });
      }
    }),
  );

  // attach merged source lists (deduplicated stories)
  for (const row of rows) {
    const merged = seen.get(String(row["dedupe_key"]))?.sources ?? [];
    row["extra_sources"] = merged.slice(1);
  }

  let inserted = 0;
  if (rows.length) {
    const saved = await rest("news_articles?on_conflict=dedupe_key", {
      method: "POST",
      body: JSON.stringify(rows),
      headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
    });
    inserted = Array.isArray(saved) ? saved.length : 0;
  }

  return Response.json({
    ok: true,
    sources: sources.length,
    candidates: rows.length,
    inserted,
    errors,
  });
}
