import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Phone,
  Send,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Paperclip,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabaseClient";
import { PageLayout } from "@/components/PageLayout";


export const Route = createFileRoute("/messages/$pupilId")({
  head: () => ({
    meta: [{ title: "Message pupil — DSM by EveryDriver" }],
  }),
  component: PupilThreadPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;

interface Pupil {
  id: string;
  name: string | null;
  first_name: string | null;
  phone: string | null;
  profile_image_url: string | null;
  auth_user_id: string | null;
}

interface ChatMessage {
  id: string;
  pupil_id: string;
  instructor_id: string;
  sender_type: "instructor" | "pupil" | string;
  sender_id: string | null;
  body: string;
  created_at: string;
  read_at: string | null;
  deleted_at: string | null;
}

interface PendingOffer {
  id: string;
  instructor_id: string;
  pupil_id: string;
  slot_date: string;
  slot_time: string;
  duration_minutes: number;
  status: string;
  sent_via: string | null;
  discount_code_id: string | null;
  discount_type: string | null;
  discount_value: number | null;
  original_price: number | null;
  discounted_price: number | null;
  created_at: string;
}

function formatSlotWhen(slotDate: string, slotTime: string): string {
  try {
    const d = new Date(`${slotDate}T${slotTime}`);
    const dateStr = d.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    const timeStr = slotTime.slice(0, 5);
    return `${dateStr} at ${timeStr}`;
  } catch {
    return `${slotDate} at ${slotTime}`;
  }
}

const ACCEPT_WORDS = ["yes", "yeah", "yep", "yup", "sure", "ok", "okay", "confirm", "sounds good"];
function looksLikeAcceptance(body: string): boolean {
  const t = body.trim().toLowerCase();
  if (!t) return false;
  for (const w of ACCEPT_WORDS) {
    if (t === w) return true;
    if (t.startsWith(w)) {
      const nextChar = t.charAt(w.length);
      if (nextChar === "" || /[\s.!?,]/.test(nextChar)) return true;
    }
  }
  return false;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dayKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (dayKey(iso) === dayKey(today.toISOString())) return "TODAY";
  if (dayKey(iso) === dayKey(yesterday.toISOString())) return "YESTERDAY";
  return d
    .toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
    .toUpperCase();
}

function initialsOf(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join("") || "?"
  );
}

const SYSTEM_TYPES = ["call", "missed_call", "sms_event", "system", "event"];


function PupilThreadPage() {
  const { pupilId } = Route.useParams();
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [pupil, setPupil] = useState<Pupil | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingOffer, setPendingOffer] = useState<PendingOffer | null>(null);
  const [booking, setBooking] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [matchIndex, setMatchIndex] = useState(0);
  const matchRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id ?? null;
      setUserId(uid);
      if (!uid) return;

      const { data: p, error: pErr } = await supabase
        .from("pupils")
        .select("id, name, first_name, phone, profile_image_url, auth_user_id")
        .eq("id", pupilId)
        .maybeSingle();
      if (pErr) console.error("[pupil-thread] pupil fetch error", pErr);
      setPupil((p as unknown as Pupil) ?? null);

      const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
      const SUPABASE_ANON_KEY =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";
      const { data: sessionRes } = await supabase.auth.getSession();
      const token = sessionRes.session?.access_token;
      console.log("[dsm-messages] fetching for pupil:", pupilId, "instructor:", uid);
      const url = `${SUPABASE_URL}/rest/v1/chat_messages?pupil_id=eq.${pupilId}&instructor_id=eq.${uid}&deleted_at=is.null&order=created_at.asc&select=id,pupil_id,instructor_id,sender_type,sender_id,body,created_at,read_at,deleted_at`;
      console.log("[dsm-messages] fetch URL:", url);
      const res = await fetch(url, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token ?? ""}`,
        },
      });
      let m: ChatMessage[] = [];
      try {
        const data = await res.json();
        console.log("[dsm-messages] result:", res.status, data);
        if (res.ok && Array.isArray(data)) m = data as ChatMessage[];
        else if (!res.ok) console.error("[pupil-thread] messages fetch error", data);
      } catch (e) {
        console.error("[pupil-thread] messages parse error", e);
      }
      setMessages(m);

      // Mark inbound messages read
      await supabase
        .from("chat_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("pupil_id", pupilId)
        .eq("instructor_id", uid)
        .eq("sender_type", "pupil")
        .is("read_at", null);

      // Tell home screen and bottom nav to refresh unread counts
      window.dispatchEvent(new Event("dsm-messages-read"));

      channel = supabase
        .channel(`chat:${uid}:${pupilId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "chat_messages",
            filter: `pupil_id=eq.${pupilId}`,
          },
          (payload) => {
            const row = payload.new as ChatMessage;
            if (row.instructor_id !== uid) return;
            setMessages((prev) =>
              prev.some((x) => x.id === row.id) ? prev : [...prev, row],
            );
          },
        )
        .subscribe();
    })();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [pupilId]);

  // Auto-scroll to the latest message. Jump instantly on first load, then
  // smooth-scroll for new arrivals — but only if the user is already near the
  // bottom, so reading older messages isn't interrupted.
  const didInitialScrollRef = useRef(false);
  const prevCountRef = useRef(0);
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const count = messages.length;
    if (count === 0) return;

    if (!didInitialScrollRef.current) {
      didInitialScrollRef.current = true;
      prevCountRef.current = count;
      el.scrollTop = el.scrollHeight;
      return;
    }

    const grew = count > prevCountRef.current;
    prevCountRef.current = count;
    if (!grew) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom > 160) return;

    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
  }, [messages]);

  // ---- Typing indicator -------------------------------------------------
  // Lightweight realtime broadcast: each side pings "typing" while composing.
  // The other side shows "typing…" in the header until 3s of silence.
  const [pupilTyping, setPupilTyping] = useState(false);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingOffRef = useRef<number | null>(null);
  const lastSentTypingRef = useRef(0);

  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`typing:${userId}:${pupilId}`, { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "typing" }, (payload) => {
        if ((payload as { payload?: { from?: string } })?.payload?.from === "instructor") return;
        setPupilTyping(true);
        if (typingOffRef.current) window.clearTimeout(typingOffRef.current);
        typingOffRef.current = window.setTimeout(() => setPupilTyping(false), 3000);
      })
      .subscribe();
    typingChannelRef.current = ch;
    return () => {
      if (typingOffRef.current) window.clearTimeout(typingOffRef.current);
      typingChannelRef.current = null;
      supabase.removeChannel(ch);
    };
  }, [userId, pupilId]);

  // Clear the indicator as soon as a message actually lands.
  useEffect(() => {
    setPupilTyping(false);
  }, [messages.length]);

  const notifyTyping = () => {
    const ch = typingChannelRef.current;
    if (!ch) return;
    const now = Date.now();
    if (now - lastSentTypingRef.current < 1500) return; // throttle
    lastSentTypingRef.current = now;
    ch.send({ type: "broadcast", event: "typing", payload: { from: "instructor" } });
  };


  // Detect likely acceptance on the most recent pupil message and look up a pending offer.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!messages.length) {
        if (!cancelled) setPendingOffer(null);
        return;
      }
      const last = messages[messages.length - 1];
      if (last.sender_type !== "pupil" || !looksLikeAcceptance(last.body ?? "")) {
        if (!cancelled) setPendingOffer(null);
        return;
      }
      const { data, error } = await supabase
        .from("gap_filler_offers")
        .select("*")
        .eq("pupil_id", pupilId)
        .eq("status", "sent")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        console.error("[pupil-thread] pending offer lookup failed:", error);
        if (!cancelled) setPendingOffer(null);
        return;
      }
      if (!cancelled) setPendingOffer((data as unknown as PendingOffer) ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [messages, pupilId]);

  async function handleConfirmBook() {
    if (!pendingOffer || !userId || booking) return;
    setBooking(true);
    try {
      // a) Resolve pricing + optional discount validity
      let amountDue: number | null = pendingOffer.original_price;
      let discountInvalid = false;
      let discountToIncrement: { id: string; uses_count: number | null } | null = null;

      if (pendingOffer.discount_code_id) {
        const { data: dc, error: dcErr } = await supabase
          .from("discount_codes")
          .select("*")
          .eq("id", pendingOffer.discount_code_id)
          .maybeSingle();
        if (dcErr) {
          console.error("[pupil-thread] discount fetch failed:", dcErr);
          throw dcErr;
        }
        const now = Date.now();
        const expired =
          dc?.expires_at ? new Date(dc.expires_at as string).getTime() < now : false;
        const overUsed =
          dc?.max_uses != null && (dc.uses_count ?? 0) >= (dc.max_uses as number);
        if (!dc || dc.active === false || expired || overUsed) {
          discountInvalid = true;
          amountDue = pendingOffer.original_price;
        } else {
          amountDue = pendingOffer.discounted_price ?? pendingOffer.original_price;
          discountToIncrement = {
            id: dc.id as string,
            uses_count: (dc.uses_count as number | null) ?? 0,
          };
        }
      }

      // b) Insert lesson — block / national intensives pupils pay up front
      const { data: pupilPricing } = await supabase
        .from("pupils")
        .select("pricing_type")
        .eq("id", pupilId)
        .maybeSingle();
      const pricingType = ((pupilPricing?.pricing_type as string | null) ?? "").toLowerCase();
      const isPrepaidPricing =
        pricingType === "block" || pricingType === "national_intensives";

      const { error: lessonErr } = await supabase.from("lessons").insert({
        instructor_id: userId,
        pupil_id: pupilId,
        lesson_date: pendingOffer.slot_date,
        lesson_time: pendingOffer.slot_time,
        duration_minutes: pendingOffer.duration_minutes,
        status: "confirmed",
        amount_due: amountDue,
        payment_status: isPrepaidPricing ? "prepaid" : "unpaid",
      });
      if (lessonErr) {
        console.error("[pupil-thread] lesson insert failed:", lessonErr);
        throw lessonErr;
      }

      // Increment discount uses_count after successful lesson insert
      if (discountToIncrement) {
        const { error: incErr } = await supabase
          .from("discount_codes")
          .update({ uses_count: (discountToIncrement.uses_count ?? 0) + 1 })
          .eq("id", discountToIncrement.id);
        if (incErr) console.error("[pupil-thread] discount increment failed:", incErr);
      }

      // c) Update offer row
      const { error: offerErr } = await supabase
        .from("gap_filler_offers")
        .update({ status: "accepted", accepted_at: new Date().toISOString() })
        .eq("id", pendingOffer.id);
      if (offerErr) {
        console.error("[pupil-thread] offer update failed:", offerErr);
        throw offerErr;
      }

      const when = formatSlotWhen(pendingOffer.slot_date, pendingOffer.slot_time);
      const displayName = pupil?.name ?? pupil?.first_name ?? "Pupil";

      // d) Instructor notification
      const { error: notifErr } = await supabase.from("instructor_notifications").insert({
        instructor_id: userId,
        title: "Lesson booked!",
        body: `${displayName} confirmed ${when}`,
        type: "lesson",
        read: false,
      });
      if (notifErr) console.error("[pupil-thread] notification insert failed:", notifErr);

      // e) Confirmation chat message
      const confirmationBody = `Great news — you're booked in for ${when}! See you then.`;
      const { error: chatErr } = await supabase.from("chat_messages").insert({
        instructor_id: userId,
        pupil_id: pupilId,
        sender_type: "instructor",
        sender_id: userId,
        body: confirmationBody,
      });
      if (chatErr) console.error("[pupil-thread] confirmation message insert failed:", chatErr);

      // f) Success
      if (discountInvalid) {
        toast.success(
          "Booked — note: the discount code was no longer valid, full price applied",
        );
      } else {
        toast.success(`Lesson booked for ${when}`);
      }
      setPendingOffer(null);
      setBooking(false);
    } catch (err) {
      console.error("[pupil-thread] confirm & book failed:", err);
      toast.error("Something went wrong booking this lesson — please check and try again");
      setBooking(false);
    }
  }


  async function handleSend() {
    const body = messageText.trim();
    if (!body || sending || !userId) return;
    setSending(true);

    console.log("[dsm-messages] sending:", { body, pupilId, instructorId: userId });

    const now = new Date().toISOString();
    const optimistic: ChatMessage = {
      id: `tmp-${Date.now()}`,
      pupil_id: pupilId,
      instructor_id: userId,
      sender_type: "instructor",
      sender_id: userId,
      body,
      created_at: now,
      read_at: null,
      deleted_at: null,
    };
    setMessages((prev) => [...prev, optimistic]);
    setMessageText("");

    const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
    const SUPABASE_ANON_KEY =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";
    const { data: sessionRes } = await supabase.auth.getSession();
    const token = sessionRes.session?.access_token;

    let res: Response;
    let inserted: ChatMessage | null = null;
    try {
      res = await fetch(`${SUPABASE_URL}/rest/v1/chat_messages`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token ?? ""}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          instructor_id: userId,
          pupil_id: pupilId,
          sender_type: "instructor",
          sender_id: userId,
          body,
        }),
      });
      const data = await res.json().catch(() => null);
      console.log("[dsm-messages] send result:", res.status, data);
      if (res.ok && Array.isArray(data) && data.length > 0) {
        inserted = data[0] as ChatMessage;
      } else if (!res.ok) {
        throw new Error(`send failed: ${res.status}`);
      }
    } catch (err) {
      console.error("[pupil-thread] send error", err);
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setMessageText(body);
      setSending(false);
      return;
    }

    if (inserted) {
      const finalRow = inserted;
      setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? finalRow : m)));
    }
    setSending(false);
  }

  const pupilName = pupil?.name ?? pupil?.first_name ?? "Pupil";
  const phone = pupil?.phone ?? "";
  const noAccount = !!pupil && !pupil.auth_user_id;

  function sendInvite() {
    if (!phone) {
      alert("No phone number on file for this pupil.");
      return;
    }
    const msg = encodeURIComponent(
      `Hi ${pupil?.first_name ?? ""}, join EveryDriver to message me and manage your lessons: https://everydriver.app`,
    );
    window.location.href = `sms:${phone}?&body=${msg}`;
  }

  return (
    <PageLayout className="flex flex-col" style={POPPINS}>
      {/* Header */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 60,
          maxWidth: 480,
          margin: "0 auto",
          background: "#0B1F3A",
          paddingTop: "env(safe-area-inset-top, 0px)",
        }}
      >
        <div
          style={{
            height: 56,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "0 12px",
          }}
        >
          <button
            type="button"
            aria-label="Back"
            onClick={() => navigate({ to: "/pupils/$id", params: { id: pupilId } } as never)}
            style={{ background: "none", border: "none", padding: 0, display: "flex" }}
          >
            <ChevronLeft size={20} color="#C7D0DE" />
          </button>
          {pupil?.profile_image_url ? (
            <img
              src={pupil.profile_image_url}
              alt=""
              style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
            />
          ) : (
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: "#D9E6F5",
                color: "#0B1F3A",
                fontSize: 11,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                ...POPPINS,
              }}
            >
              {initialsOf(pupilName)}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                color: "#FFFFFF",
                fontSize: 14,
                fontWeight: 600,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                ...POPPINS,
              }}
            >
              {pupilName}
            </div>
            {pupilTyping && (
              <div
                style={{
                  color: "#7FB6F2",
                  fontSize: 11,
                  fontWeight: 500,
                  lineHeight: "14px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  ...POPPINS,
                }}
              >
                typing…
              </div>
            )}
          </div>

          <a
            href={phone ? `tel:${phone}` : undefined}
            aria-label="Call"
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "rgba(255,255,255,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              opacity: phone ? 1 : 0.4,
            }}
          >
            <Phone size={15} color="#C7D0DE" />
          </a>
        </div>
      </div>
      <div style={{ height: "calc(56px + env(safe-area-inset-top, 0px))" }} />


      {noAccount && (
        <div
          className="mx-3 mt-3 rounded-xl p-3 flex items-start gap-3"
          style={{
            backgroundColor: "#FEF3C7",
            borderWidth: "1px",
            borderStyle: "solid",
            borderColor: "#FCD34D",
          }}
        >
          <AlertTriangle size={18} color="#B45309" style={{ marginTop: 2, flexShrink: 0 }} />
          <div className="flex-1 min-w-0">
            <div className="text-[13px] text-[#78350F] leading-snug" style={POPPINS}>
              This pupil hasn't set up their EveryDriver account yet. Messages won't be delivered until they do.
            </div>
            <button
              type="button"
              onClick={sendInvite}
              className="mt-2 text-[13px] font-semibold"
              style={{ color: "#B45309", ...POPPINS }}
            >
              Send invite →
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollerRef}
        className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3"
        style={{ paddingBottom: 150, background: "#FFFFFF" }}
      >
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="text-[13px] text-[#6B7280]" style={POPPINS}>
              No messages yet. Say hello 👋
            </div>
          </div>
        ) : (
          messages.map((m, i) => {
            const prev = i > 0 ? messages[i - 1] : null;
            const showDate = !prev || dayKey(prev.created_at) !== dayKey(m.created_at);
            const isSystem = SYSTEM_TYPES.includes(m.sender_type);
            const mine = m.sender_type === "instructor";

            const separator = showDate ? (
              <div key={`sep-${m.id}`} style={{ display: "flex", alignItems: "center", gap: 8, margin: "6px 0" }}>
                <div style={{ flex: 1, height: 0.5, background: "#E4E8EF" }} />
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: "#9CA3AF",
                    letterSpacing: "0.05em",
                    ...POPPINS,
                  }}
                >
                  {dayLabel(m.created_at)}
                </div>
                <div style={{ flex: 1, height: 0.5, background: "#E4E8EF" }} />
              </div>
            ) : null;

            if (isSystem) {
              return (
                <div key={m.id}>
                  {separator}
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <div
                      style={{
                        background: "#F5F0E8",
                        borderRadius: 8,
                        padding: "7px 12px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        color: "#8A5A0F",
                        ...POPPINS,
                      }}
                    >
                      <Phone size={13} color="#B8791A" />
                      {m.body?.trim()
                        ? m.body
                        : `You called ${pupilName} · ${formatTime(m.created_at)}`}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div key={m.id}>
                {separator}
                <div
                  style={{
                    display: "flex",
                    flexDirection: mine ? "row-reverse" : "row",
                    gap: 8,
                    alignItems: "flex-start",
                  }}
                >
                  {mine ? (
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: "#0B1F3A",
                        color: "#FFFFFF",
                        fontSize: 10,
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        ...POPPINS,
                      }}
                    >
                      ME
                    </div>
                  ) : pupil?.profile_image_url ? (
                    <img
                      src={pupil.profile_image_url}
                      alt=""
                      style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: "#D9E6F5",
                        color: "#0B1F3A",
                        fontSize: 10,
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        ...POPPINS,
                      }}
                    >
                      {initialsOf(pupilName)}
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: mine ? "flex-end" : "flex-start",
                      maxWidth: "75%",
                      minWidth: 0,
                    }}
                  >
                    {!mine && (
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: "#6B7686",
                          marginBottom: 3,
                          ...POPPINS,
                        }}
                      >
                        {pupil?.first_name ?? pupilName}
                      </div>
                    )}
                    <div
                      style={{
                        background: mine ? "#1877D6" : "#EEF2F7",
                        color: mine ? "#FFFFFF" : "#0B1F3A",
                        borderRadius: mine ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
                        padding: "9px 12px",
                        fontSize: 13,
                        fontWeight: 400,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        ...POPPINS,
                      }}
                    >
                      {m.body}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: mine ? "#9CA3AF" : "#9CA3AF",
                        marginTop: 3,
                        alignSelf: mine ? "flex-end" : "flex-start",
                        ...POPPINS,
                      }}
                    >
                      {formatTime(m.created_at)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>


      {/* Likely-acceptance banner */}
      {pendingOffer && (
        <div
          style={{
            position: "fixed",
            bottom: 128,
            left: 0,
            right: 0,
            zIndex: 51,
            maxWidth: 480,
            margin: "0 auto",
            padding: "0 12px",
          }}
        >
          <div
            style={{
              background: "#ECFDF5",
              border: "1px solid #A7F3D0",
              borderRadius: 14,
              padding: "10px 12px",
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              boxShadow: "0 4px 12px rgba(6, 78, 59, 0.08)",
              ...POPPINS,
            }}
          >
            <CheckCircle2 size={18} color="#059669" style={{ marginTop: 2, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: "#064E3B", lineHeight: 1.35 }}>
                Looks like {pupil?.first_name ?? pupil?.name ?? "this pupil"} accepted the{" "}
                <strong>{formatSlotWhen(pendingOffer.slot_date, pendingOffer.slot_time)}</strong> slot
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 8, alignItems: "center" }}>
                <button
                  type="button"
                  onClick={handleConfirmBook}
                  disabled={booking}
                  style={{
                    background: "#059669",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: 999,
                    padding: "6px 14px",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: booking ? "default" : "pointer",
                    opacity: booking ? 0.6 : 1,
                    ...POPPINS,
                  }}
                >
                  {booking ? "Booking…" : "Confirm & book"}
                </button>
                <button
                  type="button"
                  onClick={() => setPendingOffer(null)}
                  disabled={booking}
                  style={{
                    background: "transparent",
                    color: "#065F46",
                    border: "none",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: booking ? "default" : "pointer",
                    padding: "6px 4px",
                    ...POPPINS,
                  }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Composer bar */}
      <div
        style={{
          position: "fixed",
          bottom: 64,
          left: 0,
          right: 0,
          zIndex: 50,
          background: "#FFFFFF",
          borderTop: "0.5px solid #E4E8EF",
          padding: "10px 12px",
          display: "flex",
          gap: 8,
          alignItems: "flex-end",
          maxWidth: 480,
          margin: "0 auto",
        }}
      >
        <button
          type="button"
          aria-label="Attach"
          onClick={() => toast.info("Attachments coming soon!")}
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "transparent",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            cursor: "pointer",
          }}
        >
          <Paperclip size={18} color="#6B7686" />
        </button>
        <textarea
          value={messageText}
          onChange={(e) => {
            setMessageText(e.target.value);
            if (e.target.value.trim()) notifyTyping();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Message..."
          rows={1}
          style={{
            flex: 1,
            background: "#EEF2F7",
            border: "none",
            borderRadius: 22,
            padding: "10px 16px",
            fontSize: 13,
            color: "#0B1F3A",
            resize: "none",
            outline: "none",
            maxHeight: 120,
            overflowY: "auto",
            ...POPPINS,
          }}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!messageText.trim()}
          style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            background: messageText.trim() ? "#1877D6" : "#C7D0DE",
            border: "none",
            cursor: messageText.trim() ? "pointer" : "default",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Send size={16} color="#FFFFFF" />
        </button>
      </div>

    </PageLayout>
  );
}