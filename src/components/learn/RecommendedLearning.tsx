import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { IconChevronRight, IconSparkles } from "@tabler/icons-react";
import { supabase } from "@/lib/supabaseClient";
import { getLearnItem, itemLink } from "@/lib/learnLibrary";
import {
  SEVERITY_COLOR,
  SEVERITY_LABEL,
  recommendForFaults,
  weakAreasFromFaults,
  type BitesizeLike,
  type FaultMap,
} from "@/lib/learnRecommend";

const NAVY = "#0B1F3A";
const BLUE = "#1877D6";
const GRAY_BODY = "#6B7A90";
const FONT = "Poppins, sans-serif";

/**
 * Turns the DL25 fault grid into "what to work on next" learning suggestions.
 * Renders nothing when there are no faults recorded.
 */
export default function RecommendedLearning({ faults }: { faults: FaultMap | null | undefined }) {
  const navigate = useNavigate();
  const [bitesize, setBitesize] = useState<BitesizeLike[]>([]);

  const areas = useMemo(() => weakAreasFromFaults(faults), [faults]);

  useEffect(() => {
    if (areas.length === 0) return;
    let cancelled = false;
    supabase
      .from("bitesize_videos")
      .select("id, title, description, category, duration_mins")
      .eq("is_published", true)
      .is("deleted_at", null)
      .then(({ data }) => {
        if (!cancelled && data) setBitesize(data as unknown as BitesizeLike[]);
      });
    return () => {
      cancelled = true;
    };
  }, [areas.length]);

  const recommendations = useMemo(
    () => recommendForFaults(areas, bitesize).filter((r) => r.items.length > 0),
    [areas, bitesize],
  );

  if (recommendations.length === 0) return null;

  return (
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: 16,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        padding: 14,
        fontFamily: FONT,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
        <IconSparkles stroke={1.6} size={17} color={BLUE} />
        <div style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>Recommended learning</div>
      </div>
      <div style={{ fontSize: 12, color: GRAY_BODY, marginBottom: 12 }}>
        Based on the faults marked above.
      </div>

      {recommendations.map((rec) => (
        <div key={rec.topic.id} style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: SEVERITY_COLOR[rec.topic.severity],
              }}
            />
            <span style={{ fontSize: 13, fontWeight: 600, color: NAVY, flex: 1 }}>
              {rec.topic.label}
            </span>
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                color: SEVERITY_COLOR[rec.topic.severity],
              }}
            >
              {SEVERITY_LABEL[rec.topic.severity]} ×{rec.topic.count}
            </span>
          </div>

          {rec.items.map((item) => (
            <button
              key={`${rec.topic.id}-${item.kind}-${item.id}`}
              type="button"
              onClick={() => {
                if (item.kind === "bitesize") {
                  navigate({ to: "/bitesize" as never });
                  return;
                }
                const link = itemLink(getLearnItem(item.id) ?? ({} as never));
                if (link && typeof window !== "undefined") {
                  window.open(link, "_blank", "noopener,noreferrer");
                } else {
                  navigate({ to: "/learn" as never });
                }
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                textAlign: "left",
                background: "#F7F9FC",
                border: "none",
                borderRadius: 10,
                padding: "9px 10px",
                marginBottom: 6,
                cursor: "pointer",
                fontFamily: FONT,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: NAVY, lineHeight: 1.3 }}>
                  {item.title}
                </div>
                <div style={{ fontSize: 11.5, color: GRAY_BODY }}>
                  {item.source}
                  {item.minutes ? ` · ${item.minutes} min` : ""}
                </div>
              </div>
              <IconChevronRight stroke={1.5} size={16} color={GRAY_BODY} />
            </button>
          ))}
        </div>
      ))}

      <button
        type="button"
        onClick={() => navigate({ to: "/learn" as never })}
        style={{
          width: "100%",
          height: 40,
          borderRadius: 10,
          border: "0.5px solid #E2E6ED",
          background: "#FFFFFF",
          color: BLUE,
          fontSize: 13,
          fontWeight: 600,
          fontFamily: FONT,
          cursor: "pointer",
        }}
      >
        Open DSM Learn
      </button>
    </div>
  );
}
