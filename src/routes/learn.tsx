import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Play, Star, TrendingUp } from "lucide-react";
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
const LABEL_GRAY = "#5F6B7A";
const FONT = "Poppins, sans-serif";

type Video = { title: string; duration: string };

const HOW_TO_VIDEOS: Video[] = [
  { title: "Fill gaps in your schedule automatically", duration: "0:24" },
  { title: "Reply to enquiries in one tap", duration: "0:31" },
  { title: "Log a lesson from the timeline", duration: "0:18" },
  { title: "Set up recurring lessons", duration: "0:42" },
];

function SectionLabel({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "0 16px 10px",
        fontSize: 12,
        fontWeight: 600,
        color: LABEL_GRAY,
      }}
    >
      {icon}
      <span>{children}</span>
    </div>
  );
}

function VideoCard({ v, index }: { v: Video; index: number }) {
  const fill = index % 2 === 0 ? NAVY : BLUE;
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
        width: "100%",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "1 / 1",
          borderRadius: 14,
          overflow: "hidden",
          background: fill,
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
            padding: "3px 8px",
            borderRadius: 999,
            background: "rgba(0,0,0,0.55)",
            color: "white",
            fontSize: 11,
            fontWeight: 600,
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

      <div style={{ padding: "12px 16px 4px" }}>
        <p style={{ fontSize: 14, color: GRAY_BODY, margin: 0 }}>
          Quick guides to get more out of DSM.
        </p>
      </div>

      <div style={{ marginTop: 18 }}>
        <SectionLabel icon={<IconPlayerPlay size={14} color={BLUE} />}>How to</SectionLabel>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            padding: "0 16px",
          }}
        >
          {HOW_TO_VIDEOS.map((v, i) => (
            <VideoCard key={v.title} v={v} index={i} />
          ))}
        </div>
      </div>

      {GROUPS.map((group) => (
        <div key={group.heading} style={{ marginTop: 24 }}>
          <SectionLabel icon={<group.icon size={14} color={BLUE} />}>{group.heading}</SectionLabel>
          <div
            style={{
              margin: "0 16px",
              background: "white",
              borderRadius: 14,
              boxShadow: CARD_SHADOW,
              overflow: "hidden",
            }}
          >
            {group.items.map((g, i) => (
              <GuideRow
                key={g.title}
                g={g}
                onGo={() => navigate({ to: g.route as never })}
                isLast={i === group.items.length - 1}
              />
            ))}
          </div>
        </div>
      ))}

    </PageLayout>
  );
}
