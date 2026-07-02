import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  Mail,
  MessageSquare,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { Card } from "../components/dsm/Card";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [{ title: "Help & Support — DSM by EveryDriver" }],
  }),
  component: HelpPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;

interface ContactItem {
  label: string;
  icon: React.ReactNode;
  iconBg: string;
  href: string;
}

const contacts: ContactItem[] = [
  {
    label: "Email support",
    icon: <Mail size={18} color="#1A4A6E" />,
    iconBg: "#DBEAFE",
    href: "mailto:support@everydriver.co.uk",
  },
  {
    label: "WhatsApp",
    icon: <MessageSquare size={18} color="#16A34A" />,
    iconBg: "#DCFCE7",
    href: "https://wa.me/447700000000",
  },
];

interface FaqItem {
  question: string;
  answer: string;
}

const faqs: FaqItem[] = [
  {
    question: "How do I add a pupil?",
    answer:
      "Tap the + button on the Pupils screen or use Quick Access on the home screen.",
  },
  {
    question: "How do I record a payment?",
    answer:
      "Go to Payments and tap the £ button to record a manual payment.",
  },
  {
    question: "How do I sync my calendar?",
    answer:
      "Go to Settings → Calendar sync to set up ICS feed sync.",
  },
  {
    question: "How do I change my working hours?",
    answer:
      "Go to Settings → Working hours or use the Availability screen.",
  },
  {
    question: "How do I cancel a lesson?",
    answer:
      "Open the lesson from Schedule, tap Cancel lesson, select a reason and confirm.",
  },
  {
    question: "How do I add a driving test?",
    answer: "Go to the Tests screen and tap the + button.",
  },
];

function HelpPage() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-white pb-8" style={POPPINS}>
      {/* Top bar */}
      <div
        className="sticky top-0 z-40 flex items-center justify-between px-2"
        style={{ height: 52, backgroundColor: "#072b47" }}
      >
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate({ to: "/home" })}
          className="flex items-center justify-center"
          style={{ width: 40, height: 40 }}
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </button>
        <div className="flex-1 text-center text-[15px] font-semibold text-white" style={POPPINS}>
          Help &amp; support
        </div>
        <div style={{ width: 40, height: 40 }} />
      </div>

      {/* GET IN TOUCH */}
      <div className="px-4">
        <SectionHeader>GET IN TOUCH</SectionHeader>
        <div className="flex flex-col" style={{ gap: 8 }}>
          {contacts.map((c) => (
            <a
              key={c.label}
              href={c.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center bg-[#F8F9FB] rounded-xl p-4"
              style={{
                borderWidth: "0.5px",
                borderStyle: "solid",
                borderColor: "#EEF2F7",
                textDecoration: "none",
              }}
            >
              <div
                className="flex items-center justify-center rounded-full shrink-0"
                style={{ width: 36, height: 36, backgroundColor: c.iconBg }}
              >
                {c.icon}
              </div>
              <span className="flex-1 ml-3 text-[14px] font-semibold text-[#0C2340]">
                {c.label}
              </span>
              <ChevronRight size={18} color="#6B7280" className="shrink-0" />
            </a>
          ))}
        </div>
      </div>

      {/* FAQS */}
      <div className="px-4">
        <SectionHeader>FAQS</SectionHeader>
        <Card className="!p-0">
          {faqs.map((faq, i) => {
            const isOpen = openFaq === i;
            return (
              <div key={i}>
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left"
                  style={
                    i === 0
                      ? undefined
                      : {
                          borderTopWidth: "0.5px",
                          borderTopStyle: "solid",
                          borderTopColor: "#EEF2F7",
                        }
                  }
                >
                  <span className="text-[14px] font-semibold text-[#0C2340] pr-2">
                    {faq.question}
                  </span>
                  {isOpen ? (
                    <ChevronDown size={18} color="#6B7280" className="shrink-0" />
                  ) : (
                    <ChevronRight size={18} color="#6B7280" className="shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div
                    className="px-4 pb-3 text-[13px] text-[#6B7280]"
                    style={{
                      borderTopWidth: "0.5px",
                      borderTopStyle: "solid",
                      borderTopColor: "#EEF2F7",
                      ...POPPINS,
                    }}
                  >
                    <div className="pt-2">{faq.answer}</div>
                  </div>
                )}
              </div>
            );
          })}
        </Card>
      </div>

      {/* ABOUT */}
      <div className="px-4">
        <SectionHeader>ABOUT</SectionHeader>
        <Card className="flex flex-col items-center text-center" style={{ gap: 4 }}>
          <div className="text-[16px] font-bold text-[#0C2340]">DSM by EveryDriver</div>
          <div className="text-[13px] text-[#6B7280]">Version 1.0.0</div>
          <div className="text-[13px] text-[#6B7280] mt-1">© 2026 EveryDriver Ltd</div>
        </Card>
      </div>
    </div>
  );
}

export default HelpPage;
