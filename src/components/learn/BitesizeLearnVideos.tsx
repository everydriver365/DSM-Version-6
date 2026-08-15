import { useEffect, useMemo, useState } from "react";
import { IconPlayerPlay } from "@tabler/icons-react";
import { supabase } from "@/lib/supabaseClient";
import {
  BITESIZE_CATEGORIES,
  BITESIZE_CATEGORY_EMOJI,
  bitesizeRank,
  formatVideoDuration,
  isBitesizeLength,
  isLibraryVideo,
  isPublished,
  videoThumbnail,
  type LearnVideo,
} from "@/lib/learnVideos";
import { markSeen } from "@/lib/learnSaved";
import { VideoPlayerSheet, videoKey } from "./LearnVideosSection";

const NAVY = "#0B1F3A";
const BLUE = "#1877D6";
const GRAY_BODY = "#6B7A90";
const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

/**
 * Short DSM Learn videos surfaced inside Bitesize. Same underlying
 * `learn_videos` rows as Learn → Videos — no duplicate records.
 */
export default function BitesizeLearnVideos({ limit = 12 }: { limit?: number }) {
  const [videos, setVideos] = useState<LearnVideo[]>([]);
  const [category, setCategory] = useState<string>("All");
  const [playing, setPlaying] = useState<LearnVideo | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("learn_videos")
        .select("*")
        .order("sort_order", { ascending: true });
      if (cancelled || error || !data) return;
      const rows = (data as LearnVideo[]).filter(
        (v) =>
          isLibraryVideo(v) &&
          isPublished(v) &&
          (v.is_bitesize === true || isBitesizeLength(v)),
      );
      rows.sort((a, b) => bitesizeRank(a) - bitesizeRank(b));
      setVideos(rows);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const cats = useMemo(() => {
    const present = new Set(
      videos.map((v) => v.bitesize_category).filter((c): c is string => !!c),
    );
    return ["All", ...BITESIZE_CATEGORIES.filter((c) => present.has(c))];
  }, [videos]);

  const list = useMemo(
    () =>
      (category === "All"
        ? videos
        : videos.filter((v) => v.bitesize_category === category)
      ).slice(0, limit),
    [videos, category, limit],
  );

  if (videos.length === 0) return null;

  return (
    <div style={{ background: "#fff", borderBottom: "0.5px solid #E4E8EF", padding: "14px 0 16px" }}>
      <div style={{ padding: "0 16px 8px", display: "flex", alignItems: "center", gap: 7 }}>
        <span style={{ fontSize: 14 }}>⚡</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: NAVY, ...POPPINS }}>
          Bitesize from DSM Learn
        </span>
      </div>
      <div style={{ padding: "0 16px 4px", fontSize: 12, color: GRAY_BODY, ...POPPINS }}>
        Short videos from the Learn library — 1 to 15 minutes.
      </div>

      {cats.length > 1 && (
        <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "10px 16px 2px" }}>
          {cats.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              style={{
                flexShrink: 0,
                border: "none",
                cursor: "pointer",
                borderRadius: 20,
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 600,
                background: category === c ? NAVY : "#F1F5F9",
                color: category === c ? "#fff" : "#6B7686",
                ...POPPINS,
              }}
            >
              {c === "All" ? "All" : `${BITESIZE_CATEGORY_EMOJI[c] ?? ""} ${c}`}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 12, overflowX: "auto", padding: "12px 16px 2px" }}>
        {list.map((v) => {
          const thumb = videoThumbnail(v);
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => {
                setPlaying(v);
                markSeen(videoKey(v.id));
              }}
              style={{
                flexShrink: 0,
                width: 216,
                textAlign: "left",
                border: "0.5px solid #E4E8EF",
                background: "#fff",
                borderRadius: 12,
                overflow: "hidden",
                cursor: "pointer",
                padding: 0,
                ...POPPINS,
              }}
            >
              <div
                style={{
                  width: "100%",
                  aspectRatio: "16 / 9",
                  background: thumb ? `center/cover url(${thumb})` : NAVY,
                  position: "relative",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    bottom: 6,
                    right: 6,
                    padding: "2px 7px",
                    borderRadius: 20,
                    background: "rgba(0,0,0,0.65)",
                    color: "#fff",
                    fontSize: 10.5,
                    fontWeight: 700,
                  }}
                >
                  {formatVideoDuration(v)}
                </span>
              </div>
              <div style={{ padding: 10 }}>
                {v.bitesize_category && (
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: BLUE, marginBottom: 3 }}>
                    {BITESIZE_CATEGORY_EMOJI[v.bitesize_category] ?? "⚡"} {v.bitesize_category}
                  </div>
                )}
                <div style={{ fontSize: 13, fontWeight: 600, color: NAVY, lineHeight: 1.3 }}>
                  {v.title}
                </div>
                <div style={{ fontSize: 11.5, color: GRAY_BODY, marginTop: 3 }}>{v.source}</div>
                <div
                  style={{
                    marginTop: 8,
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    color: BLUE,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  <IconPlayerPlay size={13} fill={BLUE} color={BLUE} /> Watch
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {playing && <VideoPlayerSheet video={playing} onClose={() => setPlaying(null)} />}
    </div>
  );
}
