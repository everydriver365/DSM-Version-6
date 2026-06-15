import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Info, Copy, Check } from "lucide-react";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { Card } from "../components/dsm/Card";
import { Button } from "../components/dsm/Button";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/calendarsync")({
  head: () => ({
    meta: [
      { title: "Calendar sync — DSM by EveryDriver" },
      { name: "description", content: "Sync your lessons to any calendar app using an ICS feed." },
    ],
  }),
  component: CalendarSyncPage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

const STEPS = [
  "Copy the ICS feed URL above",
  "Open Google Calendar → Other calendars → From URL",
  "Paste the URL and click Add calendar",
  "Your lessons will sync automatically every few hours",
] as const;

const APPS = ["Google Calendar", "Apple Calendar", "Outlook", "Fantastical"] as const;

function CalendarSyncPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        navigate({ to: "/login", replace: true });
        return;
      }
      setUserId(user.id);
    })();
  }, [navigate]);

  const icsUrl = userId
    ? `https://everydriver.co.uk/api/ics/${userId}`
    : "https://everydriver.co.uk/api/ics/…";

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(icsUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = icsUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function shareLink() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "My DSM Calendar Feed",
          text: "Sync your lessons to any calendar app using this ICS feed.",
          url: icsUrl,
        });
      } catch {
        // user cancelled
      }
    } else {
      copyLink();
    }
  }

  return (
    <div className="min-h-screen bg-white" style={POPPINS}>
      {/* Top bar */}
      <div
        className="sticky top-0 z-40 flex items-center justify-between px-4"
        style={{ height: 52, backgroundColor: "#0F2044" }}
      >
        <button
          type="button"
          onClick={() => navigate({ to: "/settings" })}
          className="flex items-center justify-center"
          style={{ width: 36, height: 36 }}
          aria-label="Back"
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </button>
        <div className="text-[15px] font-semibold text-white" style={POPPINS}>
          Calendar sync
        </div>
        <div style={{ width: 36 }} />
      </div>

      <div className="px-4 pb-12">
        {/* Info card */}
        <div
          className="mx-0 mt-3 flex items-start gap-3"
          style={{
            backgroundColor: "#EEF4FB",
            borderWidth: "0.5px",
            borderStyle: "solid",
            borderColor: "#1A52A0",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <Info size={20} color="#1A52A0" className="shrink-0 mt-0.5" />
          <p className="text-[13px] text-[#0F2044] leading-[1.5]" style={POPPINS}>
            Sync your lessons to any calendar app using an ICS feed. Works with Google Calendar, Apple Calendar, and Outlook.
          </p>
        </div>

        {/* ICS Feed URL */}
        <SectionHeader>YOUR ICS FEED URL</SectionHeader>
        <Card className="flex flex-col gap-3">
          <input
            readOnly
            value={icsUrl}
            className="h-11 w-full rounded-lg px-3 text-[14px] text-[#1A1A2E] bg-white"
            style={{
              fontFamily: "Poppins, sans-serif",
              borderWidth: "0.5px",
              borderStyle: "solid",
              borderColor: "#E2E6ED",
            }}
            onFocus={(e) => e.target.select()}
          />
          <Button onClick={copyLink}>
            {copied ? (
              <span className="inline-flex items-center gap-2">
                <Check size={16} /> Copied!
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <Copy size={16} /> Copy link
              </span>
            )}
          </Button>
          <Button variant="ghost" onClick={shareLink}>
            Share link
          </Button>
        </Card>

        {/* How to add */}
        <SectionHeader>HOW TO ADD TO YOUR CALENDAR</SectionHeader>
        <div className="flex flex-col gap-3">
          {STEPS.map((text, i) => (
            <div
              key={i}
              className="flex items-start gap-3"
              style={{
                backgroundColor: "#F8F9FB",
                borderWidth: "0.5px",
                borderStyle: "solid",
                borderColor: "#E2E6ED",
                borderRadius: 12,
                padding: 14,
              }}
            >
              <div
                className="flex items-center justify-center shrink-0 rounded-full text-[12px] font-semibold text-white"
                style={{ width: 28, height: 28, backgroundColor: "#1A52A0", ...POPPINS }}
              >
                {i + 1}
              </div>
              <p className="text-[14px] text-[#0F2044] leading-[1.4] pt-0.5" style={POPPINS}>
                {text}
              </p>
            </div>
          ))}
        </div>

        {/* Supported apps */}
        <SectionHeader>SUPPORTED APPS</SectionHeader>
        <div className="flex flex-wrap gap-2">
          {APPS.map((app) => (
            <span
              key={app}
              className="inline-block px-3 py-1.5 text-[12px] font-medium text-[#1A52A0]"
              style={{
                backgroundColor: "#EEF4FB",
                borderRadius: 9999,
                borderWidth: "0.5px",
                borderStyle: "solid",
                borderColor: "#1A52A0",
                ...POPPINS,
              }}
            >
              {app}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
