import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  ChevronRight,
  Play,
  Star,
  TrendingUp,
  ShoppingBag,
  Award,
  CalendarOff,
  Zap,
  CalendarDays,
  X,
} from "lucide-react";
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

type Video = { title: string; duration: string; url: string | null };

const HOW_TO_VIDEOS: Video[] = [
  { title: "Fill gaps in your schedule automatically", duration: "0:24", url: null },
  { title: "Reply to enquiries in one tap", duration: "0:31", url: null },
  { title: "Log a lesson from the timeline", duration: "0:18", url: null },
  { title: "Set up recurring lessons", duration: "0:42", url: null },
];

type Guide = { icon: LucideIcon; title: string; subtitle: string; route: string };

const GROUPS: { heading: string; icon: LucideIcon; items: Guide[] }[] = [
  {
    heading: "Grow your business",
    icon: TrendingUp,
    items: [
      { icon: Star, title: "Get more 5 star reviews", subtitle: "2 min read", route: "/reviews" },
      { icon: ShoppingBag, title: "Marketplace", subtitle: "Sell courses and services to other ADIs", route: "/marketplace" },
      { icon: Award, title: "Accreditations", subtitle: "Show pupils the qualifications you've earned", route: "/certifications" },
    ],
  },
  {
    heading: "Organise your day",
    icon: CalendarDays,
    items: [
      { icon: CalendarOff, title: "Gap Filler", subtitle: "Find pupils for empty slots automatically", route: "/gaps" },
      { icon: Zap, title: "Auto-booking", subtitle: "Let pupils book into your free time", route: "/availability" },
    ],
  },
];

function GuideRow({ g, onGo, isLast }: { g: Guide; onGo: () => void; isLast: boolean }) {
  const Icon = g.icon;
  return (
    <button
      type="button"
      onClick={onGo}
      style={{
        width: "100%",
        background: "white",
        border: "none",
        padding: "12px 14px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        cursor: "pointer",
        textAlign: "left",
        fontFamily: FONT,
        borderBottom: isLast ? "none" : "1px solid #F0F3F7",
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
        <Icon size={18} color={BLUE} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: NAVY, lineHeight: 1.3 }}>{g.title}</div>
        <div style={{ fontSize: 12, color: "#8A94A3", lineHeight: 1.35, marginTop: 1 }}>
          {g.subtitle}
        </div>
      </div>
      <ChevronRight size={18} color="#8A94A3" />
    </button>
  );
}



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

function VideoCard({ v, index, onPlay }: { v: Video; index: number; onPlay: () => void }) {
  const fill = index % 2 === 0 ? NAVY : BLUE;
  return (
    <button
      type="button"
      onClick={onPlay}
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
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);

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
            <VideoCard
              key={v.title}
              v={v}
              index={i}
              onPlay={() => {
                if (v.url) setActiveVideo(v);
                else toast.info("Video coming soon");
              }}
            />
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

      {activeVideo?.url && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            background: "rgba(0,0,0,0.92)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setActiveVideo(null)}
        >
          <button
            type="button"
            aria-label="Close video"
            onClick={() => setActiveVideo(null)}
            style={{
              position: "absolute",
              top: "calc(16px + env(safe-area-inset-top, 0px))",
              right: 16,
              width: 36,
              height: 36,
              borderRadius: "50%",
              border: "none",
              background: "rgba(255,255,255,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={20} color="#FFFFFF" />
          </button>
          <video
            src={activeVideo.url}
            controls
            autoPlay
            playsInline
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxHeight: "80vh", background: "#000" }}
          />
        </div>
      )}
    </PageLayout>
  );
}
