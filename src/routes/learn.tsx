import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Play, ShoppingBag, Award, CalendarOff, Zap } from "lucide-react";
import { PageLayout } from "@/components/PageLayout";

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

const NAVY = "#0F2044";
const BLUE = "#1877D6";
const CANVAS = "#EEF2F7";
const CARD_SHADOW = "0 1px 3px rgba(0,0,0,0.06)";
const GRAY_BODY = "#6B7A90";
const GRAY_LIGHT = "#8592A6";
const FONT = "Poppins, sans-serif";

type Video = { title: string; duration: string };

const HOW_TO_VIDEOS: Video[] = [
  { title: "Fill gaps in your schedule automatically", duration: "0:24" },
  { title: "Reply to enquiries in one tap", duration: "0:31" },
  { title: "Log a lesson from the timeline", duration: "0:18" },
  { title: "Send a payment link over WhatsApp", duration: "0:22" },
  { title: "Set your weekly working hours", duration: "0:29" },
  { title: "Track a lesson in DSM Live", duration: "0:26" },
];

type Guide = { icon: any; title: string; description: string; route: string };

const GROUPS: { heading: string; items: Guide[] }[] = [
  {
    heading: "Grow your business",
    items: [
      { icon: ShoppingBag, title: "Marketplace", description: "Sell courses, resources and services to other ADIs.", route: "/marketplace" },
      { icon: Award, title: "Accreditations", description: "Show pupils the qualifications you've earned.", route: "/certifications" },
    ],
  },
  {
    heading: "Organize your day",
    items: [
      { icon: CalendarOff, title: "Gap Filler", description: "Find pupils to book into empty slots automatically.", route: "/gaps" },
      { icon: Zap, title: "Auto-booking", description: "Let pupils book themselves into your free time.", route: "/availability" },
    ],
  },
];

function VideoCard({ v }: { v: Video }) {
  return (
    <button
      type="button"
      style={{
        flex: "0 0 auto",
        width: 150,
        background: "transparent",
        border: "none",
        padding: 0,
        cursor: "pointer",
        textAlign: "left",
        fontFamily: FONT,
        scrollSnapAlign: "start",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "9 / 14",
          borderRadius: 14,
          overflow: "hidden",
          background: `linear-gradient(135deg, ${NAVY} 0%, ${BLUE} 100%)`,
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
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
            }}
          >
            <Play size={20} color={NAVY} fill={NAVY} style={{ marginLeft: 2 }} />
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 8,
            right: 8,
            padding: "3px 8px",
            borderRadius: 999,
            background: "rgba(15,32,68,0.7)",
            color: "white",
            fontSize: 10.5,
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
          fontSize: 12.5,
          fontWeight: 700,
          color: NAVY,
          lineHeight: 1.3,
        }}
      >
        {v.title}
      </div>
    </button>
  );
}

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
          width: 34,
          height: 34,
          borderRadius: 10,
          background: "#E5EFFA",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={17} color={BLUE} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: NAVY, lineHeight: 1.3 }}>
          {g.title}
        </div>
        <div style={{ fontSize: 12.5, color: GRAY_BODY, lineHeight: 1.35, marginTop: 1 }}>
          {g.description}
        </div>
      </div>
      <ChevronRight size={18} color={GRAY_LIGHT} />
    </button>
  );
}

function LearnPage() {
  const navigate = useNavigate();

  return (
    <PageLayout className="pb-24" style={{ fontFamily: FONT, background: CANVAS }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "12px 16px 4px",
        }}
      >
        <button
          type="button"
          onClick={() => navigate({ to: "/more" as never })}
          aria-label="Back"
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "white",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: CARD_SHADOW,
            cursor: "pointer",
          }}
        >
          <ChevronLeft size={20} color={NAVY} />
        </button>
      </div>

      <div style={{ padding: "8px 16px 4px" }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: NAVY, margin: 0, lineHeight: 1.15 }}>
          Learn
        </h1>
        <p style={{ fontSize: 14, color: GRAY_BODY, margin: "4px 0 0" }}>
          Quick guides to get more out of DSM.
        </p>
      </div>

      <div style={{ marginTop: 20 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: GRAY_LIGHT,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            padding: "0 16px 10px",
          }}
        >
          How to
        </div>
        <div
          style={{
            display: "flex",
            gap: 12,
            padding: "0 16px 4px",
            overflowX: "auto",
            scrollSnapType: "x mandatory",
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch",
          }}
          className="hide-scrollbar"
        >
          <style>{`.hide-scrollbar::-webkit-scrollbar{display:none;}`}</style>
          {HOW_TO_VIDEOS.map((v, i) => (
            <VideoCard key={i} v={v} />
          ))}
        </div>
      </div>

      {GROUPS.map((group) => (
        <div key={group.heading} style={{ marginTop: 24 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: GRAY_LIGHT,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              padding: "0 16px 8px",
            }}
          >
            {group.heading}
          </div>
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
