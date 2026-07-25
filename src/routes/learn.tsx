import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Star, TrendingUp, Play } from "lucide-react";
import { IconPlayerPlay } from "@tabler/icons-react";
import { toast } from "sonner";
import { PageLayout } from "@/components/PageLayout";
import InstructorTopBar from "@/components/dsm/InstructorTopBar";

export const Route = createFileRoute("/learn")({
  head: () => ({
    meta: [
      { title: "Learn — DSM" },
      { name: "description", content: "Quick guides and how-to videos to help you get more out of DSM." },
      { property: "og:title", content: "Learn — DSM" },
      { property: "og:description", content: "Quick guides and how-to videos to help you get more out of DSM." },
    ],
  }),
  component: LearnPage,
});

const NAVY = "#0B1F3A";
const BLUE = "#1877D6";
const CANVAS = "#EEF2F7";
const CARD_SHADOW = "0 1px 3px rgba(0,0,0,0.06)";
const GRAY_BODY = "#6B7A90";
const GRAY_LABEL = "#5F6B7A";
const GRAY_SUBTITLE = "#8A94A3";
const FONT = "Poppins, sans-serif";

type Video = { title: string; duration: string };

const HOW_TO_VIDEOS: Video[] = [
  { title: "Fill gaps in your schedule automatically", duration: "0:24" },
  { title: "Reply to enquiries in one tap", duration: "0:31" },
  { title: "Log a lesson from the timeline", duration: "0:18" },
  { title: "Set up recurring lessons", duration: "0:42" },
];

function VideoCard({ v, color }: { v: Video; color: string }) {
  return (
    <button
      type="button"
      style={{
        background: "transparent",
        border: "none",
        padding: 0,
        cursor: "pointer",
        textAlign: "left",
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "1 / 1",
          borderRadius: 14,
          overflow: "hidden",
          background: color,
          boxShadow: CARD_SHADOW,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Play size={18} color={NAVY} fill={NAVY} style={{ marginLeft: 2 }} />
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 8,
            right: 8,
            padding: "4px 8px",
            borderRadius: 999,
            background: "rgba(0,0,0,0.55)",
            color: "white",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 0.2,
          }}
        >
          {v.duration}
        </div>
      </div>
      <div
        style={{
          marginTop: 8,
          fontSize: 13,
          fontWeight: 600,
          color: NAVY,
          lineHeight: 1.3,
        }}
      >
        {v.title}
      </div>
    </button>
  );
}

function SectionLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "0 16px 12px",
      }}
    >
      {icon}
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: GRAY_LABEL,
          fontFamily: FONT,
        }}
      >
        {label}
      </span>
    </div>
  );
}

function LearnPage() {
  const navigate = useNavigate();

  return (
    <PageLayout className="pb-24" style={{ fontFamily: FONT, background: CANVAS }}>
      <InstructorTopBar
        firstName=""
        pageTitle="Learn"
        onBack={() => navigate({ to: "/more" as never })}
        onBell={() => navigate({ to: "/notifications" as never })}
        onPhone={() => navigate({ to: "/enquiries" as never })}
        onLiveTrack={() => navigate({ to: "/live" as never })}
        onMenu={() => navigate({ to: "/more" as never })}
        onMicPress={() => toast.info("Voice commands coming soon!")}
      />
      <div style={{ height: "calc(60px + env(safe-area-inset-top, 0px))" }} />

      <div style={{ padding: "8px 16px 4px" }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: NAVY, margin: 0, lineHeight: 1.15 }}>
          Learn
        </h1>
        <p style={{ fontSize: 14, color: GRAY_BODY, margin: "4px 0 0" }}>
          Quick guides to get more out of DSM.
        </p>
      </div>

      <div style={{ marginTop: 20 }}>
        <SectionLabel
          icon={<IconPlayerPlay size={14} color={BLUE} />}
          label="How to"
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            padding: "0 16px",
          }}
        >
          {HOW_TO_VIDEOS.map((v, i) => (
            <VideoCard key={i} v={v} color={i % 2 === 0 ? NAVY : BLUE} />
          ))}
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <SectionLabel
          icon={<TrendingUp size={14} color={BLUE} />}
          label="Grow your business"
        />
        <button
          type="button"
          onClick={() => navigate({ to: "/reviews" as never })}
          style={{
            margin: "0 16px",
            width: "calc(100% - 32px)",
            background: "white",
            borderRadius: 14,
            boxShadow: CARD_SHADOW,
            padding: "12px 14px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            cursor: "pointer",
            textAlign: "left",
            border: "none",
            fontFamily: FONT,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "#E6F1FB",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Star size={17} color={BLUE} fill={BLUE} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: NAVY, lineHeight: 1.3 }}>
              Get more 5 star reviews
            </div>
            <div style={{ fontSize: 12, color: GRAY_SUBTITLE, lineHeight: 1.35, marginTop: 1 }}>
              2 min read
            </div>
          </div>
          <ChevronRight size={18} color={GRAY_SUBTITLE} />
        </button>
      </div>
    </PageLayout>
  );
}
