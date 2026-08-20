import { tokens } from "@/lib/tokens";
import { useEffect, useMemo, useState } from "react";
import { IconPlayerPlay } from "@tabler/icons-react";
import { supabase } from "@/lib/supabaseClient";
import {
  BITESIZE_CATEGORY_EMOJI,
  BITESIZE_SECTIONS,
  bitesizeLabel,
  bitesizeRank,
  bitesizeSection,
  formatVideoDuration,
  isBitesizeEligible,
  isLibraryVideo,
  isPublished,
  videoThumbnail,
  type BitesizeSection,
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
 * `learn_videos` rows as Learn → Videos — no duplicate records, no second
 * database. Eligibility comes from the admin `is_bitesize` flag or, for
 * unmarked rows, an automatic 1–15 minute length rule.
 */
export default function BitesizeLearnVideos({ limitPerSection = 12 }: { limitPerSection?: number }) {
  const [videos, setVideos] = useState<LearnVideo[]>([]);
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
        (v) => isLibraryVideo(v) && isPublished(v) && isBitesizeEligible(v),
      );
      rows.sort(
        (a, b) =>
          Number(!!b.is_featured) - Number(!!a.is_featured) ||
          bitesizeRank(a) - bitesizeRank(b) ||
          (a.sort_order ?? 0) - (b.sort_order ?? 0),
      );
      setVideos(rows);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<BitesizeSection, LearnVideo[]>();
    for (const v of videos) {
      const key = bitesizeSection(v);
      const list = map.get(key) ?? [];
      if (!list.some((x) => x.id === v.id)) list.push(v);
      map.set(key, list);
    }
    return map;
  }, [videos]);

  if (videos.length === 0) return null;

  return (
    <div style={{ background: "#fff", borderBottom: "0.5px solid #E4E8EF", padding: "14px 0 18px" }}>
      <div style={{ padding: "0 16px 2px", display: "flex", alignItems: "center", gap: 7 }}>
        <span style={{ fontSize: 14 }}>⚡</span>
        <span style={{ fontSize: tokens.fontSize.md, fontWeight: tokens.fontWeight.bold, color: NAVY, ...POPPINS }}>
          Bitesize from DSM Learn
        </span>
      </div>
      <div style={{ padding: "0 16px", fontSize: 12, color: GRAY_BODY, ...POPPINS }}>
        Short videos from the Learn library — 1 to 15 minutes.
      </div>

      {BITESIZE_SECTIONS.map((section) => {
        const list = (grouped.get(section.key) ?? []).slice(0, limitPerSection);
        if (list.length === 0) return null;
        return (
          <div key={section.key} style={{ marginTop: 14 }}>
            <div
              style={{
                padding: "0 16px 2px",
                display: "flex",
                alignItems: "center",
                gap: 7,
                ...POPPINS,
              }}
            >
              <span style={{ fontSize: 13 }}>{section.emoji}</span>
              <span style={{ fontSize: 13.5, fontWeight: tokens.fontWeight.bold, color: NAVY }}>{section.title}</span>
              <span style={{ fontSize: 11.5, color: GRAY_BODY, marginLeft: "auto" }}>
                {list.length}
              </span>
            </div>

            <div style={{ display: "flex", gap: 12, overflowX: "auto", padding: "10px 16px 2px" }}>
              {list.map((v) => {
                const thumb = videoThumbnail(v);
                const label = bitesizeLabel(v);
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
                      borderRadius: 8,
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
                          inset: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <span
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: "50%",
                            background: "rgba(11,31,58,0.72)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <IconPlayerPlay size={15} fill="#fff" color="#fff" />
                        </span>
                      </span>
                      {formatVideoDuration(v) && (
                        <span
                          style={{
                            position: "absolute",
                            bottom: 6,
                            right: 6,
                            padding: "2px 7px",
                            borderRadius: 8,
                            background: "rgba(0,0,0,0.65)",
                            color: "#fff",
                            fontSize: 10.5,
                            fontWeight: tokens.fontWeight.bold,
                          }}
                        >
                          {formatVideoDuration(v)}
                        </span>
                      )}
                    </div>
                    <div style={{ padding: 10 }}>
                      <div style={{ fontSize: 10.5, fontWeight: tokens.fontWeight.bold, color: BLUE, marginBottom: 3 }}>
                        {BITESIZE_CATEGORY_EMOJI[label] ?? "⚡"} {label}
                      </div>
                      <div style={{ fontSize: tokens.fontSize.base, fontWeight: tokens.fontWeight.semibold, color: NAVY, lineHeight: 1.3 }}>
                        {v.title}
                      </div>
                      <div style={{ fontSize: 11.5, color: GRAY_BODY, marginTop: 3 }}>
                        {v.source ?? "DSM Learn"}
                        {formatVideoDuration(v) ? ` · ${formatVideoDuration(v)}` : ""}
                      </div>
                      <div
                        style={{
                          marginTop: 8,
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          color: BLUE,
                          fontSize: 12,
                          fontWeight: tokens.fontWeight.bold,
                        }}
                      >
                        <IconPlayerPlay size={13} fill={BLUE} color={BLUE} /> Watch
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {playing && <VideoPlayerSheet video={playing} onClose={() => setPlaying(null)} />}
    </div>
  );
}
