import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Inbox,
  Phone,
  Mail,
  Check,
  X,
  CheckCircle,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "../components/dsm/Card";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/enquiries")({
  head: () => ({
    meta: [{ title: "Enquiries — DSM by EveryDriver" }],
  }),
  component: EnquiriesPage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

interface EnquiryNotification {
  id: string;
  title: string | null;
  body: string | null;
  type: string;
  read: boolean;
  created_at: string;
  reference_id: string | null;
}

interface EnquiryRow {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  course_interest: string | null;
  transmission: string | null;
  requested_hours: number | string | null;
  preferred_timing: string | null;
  preferred_start_date: string | null;
  postcode: string | null;
  notes: string | null;
  status: string | null;
  created_at: string | null;
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function formatLongDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function EnquiriesPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<EnquiryNotification[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [enquiryById, setEnquiryById] = useState<Record<string, EnquiryRow | null>>({});
  const [loadingEnquiryId, setLoadingEnquiryId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data, error }) => {
      console.log("[enquiries] getSession", { user: data.session?.user?.id ?? null, error });
      if (mounted) setUserId(data.session?.user?.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[enquiries] onAuthStateChange", event, session?.user?.id ?? null);
      if (mounted) setUserId(session?.user?.id ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function load(uid: string) {
    console.log("[enquiries] fetching notifications for", uid);
    const { data, error } = await supabase
      .from("instructor_notifications")
      .select("id, title, body, type, read, created_at, reference_id")
      .eq("instructor_id", uid)
      .eq("type", "enquiry")
      .order("created_at", { ascending: false });
    console.log("[enquiries] fetch result", { count: data?.length ?? 0, data, error });
    if (error) {
      console.error("[enquiries] fetch error", error);
      toast.error(`Couldn't load enquiries: ${error.message}`);
    }
    setItems((data ?? []) as EnquiryNotification[]);
  }

  useEffect(() => {
    if (userId) load(userId);
  }, [userId]);

  async function markRead(n: EnquiryNotification) {
    if (n.read) return;
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    const { error } = await supabase
      .from("instructor_notifications")
      .update({ read: true })
      .eq("id", n.id);
    if (error) {
      console.error("[enquiries] mark read error", error);
      toast.error("Couldn't mark as read");
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: false } : x)));
    }
  }

  return (
    <div className="min-h-screen bg-white pb-8" style={POPPINS}>
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
        <div className="flex-1 text-center text-[15px] font-semibold text-white">Enquiries</div>
        <div style={{ width: 40, height: 40 }} />
      </div>

      <div className="px-4 mt-3">
        {items.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center text-[13px]"
            style={{ color: "#6B7280", padding: "32px 0" }}
          >
            <Inbox size={24} color="#6B7280" />
            <div className="mt-2">No enquiries</div>
          </div>
        ) : (
          <div className="flex flex-col" style={{ gap: 8 }}>
            {items.map((n) => {
              const isExpanded = expandedId === n.id;
              const phone = extractPhone(`${n.title ?? ""}\n${n.body ?? ""}`);
              const email = extractEmail(`${n.title ?? ""}\n${n.body ?? ""}`);
              const lines = (n.body ?? "").split("\n").filter((l) => l.trim().length > 0);
              return (
                <div key={n.id}>
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : n.id)}
                    className="text-left w-full"
                  >
                    <Card>
                      <div className="flex items-start justify-between" style={{ gap: 8 }}>
                        <div className="min-w-0 flex-1">
                          <div className="text-[14px] font-semibold truncate" style={{ color: "#0F2044" }}>
                            {n.title ?? "Enquiry"}
                          </div>
                          {n.body && !isExpanded && (
                            <div className="text-[13px] mt-0.5 truncate" style={{ color: "#6B7280" }}>
                              {n.body}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end" style={{ gap: 4 }}>
                          <span className="text-[11px]" style={{ color: "#6B7280" }}>
                            {formatShortDate(n.created_at)}
                          </span>
                          {!n.read ? (
                            <span
                              className="text-[11px] font-semibold text-white"
                              style={{ backgroundColor: "#F59E0B", padding: "2px 8px", borderRadius: 999 }}
                            >
                              New
                            </span>
                          ) : (
                            <span
                              className="text-[11px] font-semibold"
                              style={{ color: "#6B7280", backgroundColor: "#F3F4F6", padding: "2px 8px", borderRadius: 999 }}
                            >
                              Read
                            </span>
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-3 pt-3" style={{ borderTop: "0.5px solid #E2E6ED" }}>
                          <div className="flex flex-col" style={{ gap: 4 }}>
                            {lines.length === 0 ? (
                              <div className="text-[13px]" style={{ color: "#6B7280" }}>
                                No details
                              </div>
                            ) : (
                              lines.map((line, i) => (
                                <div key={i} className="text-[13px]" style={{ color: "#1A1A2E" }}>
                                  {line}
                                </div>
                              ))
                            )}
                          </div>

                          <div className="mt-3 flex" style={{ gap: 8 }}>
                            {phone && (
                              <a
                                href={`tel:${phone}`}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center justify-center gap-1 text-[13px] font-medium text-white flex-1"
                                style={{ height: 38, borderRadius: 8, backgroundColor: "#16A34A", ...POPPINS }}
                              >
                                <Phone size={14} color="#FFFFFF" /> Call
                              </a>
                            )}
                            {email && (
                              <a
                                href={`mailto:${email}`}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center justify-center gap-1 text-[13px] font-medium text-white flex-1"
                                style={{ height: 38, borderRadius: 8, backgroundColor: "#1A52A0", ...POPPINS }}
                              >
                                <Mail size={14} color="#FFFFFF" /> Email
                              </a>
                            )}
                            {!n.read && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markRead(n);
                                }}
                                className="inline-flex items-center justify-center gap-1 text-[13px] font-medium flex-1"
                                style={{
                                  height: 38,
                                  borderRadius: 8,
                                  backgroundColor: "#F3F4F6",
                                  color: "#0F2044",
                                  ...POPPINS,
                                }}
                              >
                                <Check size={14} color="#0F2044" /> Mark read
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedId(null);
                              }}
                              aria-label="Close"
                              className="inline-flex items-center justify-center"
                              style={{
                                height: 38,
                                width: 38,
                                borderRadius: 8,
                                backgroundColor: "#F3F4F6",
                                color: "#0F2044",
                              }}
                            >
                              <X size={16} color="#0F2044" />
                            </button>
                          </div>
                        </div>
                      )}
                    </Card>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
