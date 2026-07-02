import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Info, Copy, Check, Calendar, AlertTriangle } from "lucide-react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
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

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;


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
    ? `https://bjpqxfrihwjcqprmoqfs.supabase.co/functions/v1/ics-feed?instructor_id=${userId}`
    : "https://bjpqxfrihwjcqprmoqfs.supabase.co/functions/v1/ics-feed?instructor_id=…";

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
        style={{ height: 52, backgroundColor: "#072b47" }}
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
            borderColor: "#0B7DDA",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <Info size={20} color="#0B7DDA" className="shrink-0 mt-0.5" />
          <p className="text-[13px] text-[#0A2540] leading-[1.5]" style={POPPINS}>
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
              fontFamily: "Inter, sans-serif",
              borderWidth: "0.5px",
              borderStyle: "solid",
              borderColor: "#EEF2F7",
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

        {/* Info banner */}
        <div
          className="mt-3 flex items-start gap-3"
          style={{
            backgroundColor: "#FEF3C7",
            borderWidth: "1px",
            borderStyle: "solid",
            borderColor: "#F59E0B",
            borderRadius: 8,
            padding: 12,
          }}
        >
          <AlertTriangle size={20} color="#F59E0B" className="shrink-0 mt-0.5" />
          <p className="text-[13px] text-[#0A2540] leading-[1.5]" style={POPPINS}>
            This is a one-way read feed. Your DSM lessons appear in your calendar app, but changes made in your calendar app will not sync back to DSM. Always manage your lessons in DSM.
          </p>
        </div>

        <SectionHeader>HOW TO ADD TO YOUR CALENDAR</SectionHeader>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem
            value="google"
            className="border-0"
            style={{
              backgroundColor: "#F8F9FB",
              borderRadius: 12,
              marginBottom: 12,
              borderWidth: "0.5px",
              borderStyle: "solid",
              borderColor: "#EEF2F7",
            }}
          >
            <AccordionTrigger className="px-4 py-3 text-[14px] font-semibold text-[#0A2540]" style={{ ...POPPINS, borderRadius: 12 }}>
              <span className="flex items-center gap-3">
                <Calendar size={20} color="#0B7DDA" />
                Google Calendar
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <ol className="flex flex-col gap-3 list-none">
                <li className="flex items-start gap-3">
                  <div
                    className="flex items-center justify-center shrink-0 rounded-full text-[12px] font-semibold text-white"
                    style={{ width: 28, height: 28, backgroundColor: "#0B7DDA", ...POPPINS }}
                  >
                    1
                  </div>
                  <p className="text-[14px] text-[#0A2540] leading-[1.4] pt-0.5" style={POPPINS}>
                    Open Google Calendar on a computer (not phone)
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <div
                    className="flex items-center justify-center shrink-0 rounded-full text-[12px] font-semibold text-white"
                    style={{ width: 28, height: 28, backgroundColor: "#0B7DDA", ...POPPINS }}
                  >
                    2
                  </div>
                  <p className="text-[14px] text-[#0A2540] leading-[1.4] pt-0.5" style={POPPINS}>
                    Click + next to "Other calendars" on the left sidebar
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <div
                    className="flex items-center justify-center shrink-0 rounded-full text-[12px] font-semibold text-white"
                    style={{ width: 28, height: 28, backgroundColor: "#0B7DDA", ...POPPINS }}
                  >
                    3
                  </div>
                  <p className="text-[14px] text-[#0A2540] leading-[1.4] pt-0.5" style={POPPINS}>
                    Click "From URL"
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <div
                    className="flex items-center justify-center shrink-0 rounded-full text-[12px] font-semibold text-white"
                    style={{ width: 28, height: 28, backgroundColor: "#0B7DDA", ...POPPINS }}
                  >
                    4
                  </div>
                  <p className="text-[14px] text-[#0A2540] leading-[1.4] pt-0.5" style={POPPINS}>
                    Paste your ICS feed URL above
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <div
                    className="flex items-center justify-center shrink-0 rounded-full text-[12px] font-semibold text-white"
                    style={{ width: 28, height: 28, backgroundColor: "#0B7DDA", ...POPPINS }}
                  >
                    5
                  </div>
                  <p className="text-[14px] text-[#0A2540] leading-[1.4] pt-0.5" style={POPPINS}>
                    Click "Add calendar"
                  </p>
                </li>
              </ol>
              <p className="mt-3 text-[12px] text-[#6B7280] italic" style={POPPINS}>
                Note: Updates every few hours automatically
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem
            value="apple"
            className="border-0"
            style={{
              backgroundColor: "#F8F9FB",
              borderRadius: 12,
              marginBottom: 12,
              borderWidth: "0.5px",
              borderStyle: "solid",
              borderColor: "#EEF2F7",
            }}
          >
            <AccordionTrigger className="px-4 py-3 text-[14px] font-semibold text-[#0A2540]" style={{ ...POPPINS, borderRadius: 12 }}>
              <span className="flex items-center gap-3">
                <Calendar size={20} color="#CC2229" />
                Apple Calendar
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <ol className="flex flex-col gap-3 list-none">
                <li className="flex items-start gap-3">
                  <div
                    className="flex items-center justify-center shrink-0 rounded-full text-[12px] font-semibold text-white"
                    style={{ width: 28, height: 28, backgroundColor: "#CC2229", ...POPPINS }}
                  >
                    1
                  </div>
                  <p className="text-[14px] text-[#0A2540] leading-[1.4] pt-0.5" style={POPPINS}>
                    Open the Calendar app on Mac or iPhone
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <div
                    className="flex items-center justify-center shrink-0 rounded-full text-[12px] font-semibold text-white"
                    style={{ width: 28, height: 28, backgroundColor: "#CC2229", ...POPPINS }}
                  >
                    2
                  </div>
                  <p className="text-[14px] text-[#0A2540] leading-[1.4] pt-0.5" style={POPPINS}>
                    Click File → New Calendar Subscription (Mac) or tap Calendars → Add Calendar → Add Subscription Calendar (iPhone)
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <div
                    className="flex items-center justify-center shrink-0 rounded-full text-[12px] font-semibold text-white"
                    style={{ width: 28, height: 28, backgroundColor: "#CC2229", ...POPPINS }}
                  >
                    3
                  </div>
                  <p className="text-[14px] text-[#0A2540] leading-[1.4] pt-0.5" style={POPPINS}>
                    Paste your ICS feed URL
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <div
                    className="flex items-center justify-center shrink-0 rounded-full text-[12px] font-semibold text-white"
                    style={{ width: 28, height: 28, backgroundColor: "#CC2229", ...POPPINS }}
                  >
                    4
                  </div>
                  <p className="text-[14px] text-[#0A2540] leading-[1.4] pt-0.5" style={POPPINS}>
                    Click Subscribe
                  </p>
                </li>
              </ol>
              <p className="mt-3 text-[12px] text-[#6B7280] italic" style={POPPINS}>
                Note: Updates every few hours automatically
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem
            value="outlook"
            className="border-0"
            style={{
              backgroundColor: "#F8F9FB",
              borderRadius: 12,
              marginBottom: 12,
              borderWidth: "0.5px",
              borderStyle: "solid",
              borderColor: "#EEF2F7",
            }}
          >
            <AccordionTrigger className="px-4 py-3 text-[14px] font-semibold text-[#0A2540]" style={{ ...POPPINS, borderRadius: 12 }}>
              <span className="flex items-center gap-3">
                <Calendar size={20} color="#0B7DDA" />
                Outlook
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <ol className="flex flex-col gap-3 list-none">
                <li className="flex items-start gap-3">
                  <div
                    className="flex items-center justify-center shrink-0 rounded-full text-[12px] font-semibold text-white"
                    style={{ width: 28, height: 28, backgroundColor: "#0B7DDA", ...POPPINS }}
                  >
                    1
                  </div>
                  <p className="text-[14px] text-[#0A2540] leading-[1.4] pt-0.5" style={POPPINS}>
                    Go to outlook.com and open Calendar
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <div
                    className="flex items-center justify-center shrink-0 rounded-full text-[12px] font-semibold text-white"
                    style={{ width: 28, height: 28, backgroundColor: "#0B7DDA", ...POPPINS }}
                  >
                    2
                  </div>
                  <p className="text-[14px] text-[#0A2540] leading-[1.4] pt-0.5" style={POPPINS}>
                    Click Add calendar → Subscribe from web
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <div
                    className="flex items-center justify-center shrink-0 rounded-full text-[12px] font-semibold text-white"
                    style={{ width: 28, height: 28, backgroundColor: "#0B7DDA", ...POPPINS }}
                  >
                    3
                  </div>
                  <p className="text-[14px] text-[#0A2540] leading-[1.4] pt-0.5" style={POPPINS}>
                    Paste your ICS feed URL
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <div
                    className="flex items-center justify-center shrink-0 rounded-full text-[12px] font-semibold text-white"
                    style={{ width: 28, height: 28, backgroundColor: "#0B7DDA", ...POPPINS }}
                  >
                    4
                  </div>
                  <p className="text-[14px] text-[#0A2540] leading-[1.4] pt-0.5" style={POPPINS}>
                    Click Import
                  </p>
                </li>
              </ol>
              <p className="mt-3 text-[12px] text-[#6B7280] italic" style={POPPINS}>
                Note: Updates every few hours automatically
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
