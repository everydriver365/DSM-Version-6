import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";

import { BottomSheet, PrimaryButton, SectionLabel } from "@/components/dsm/BottomSheetV2";
import { supabase } from "@/lib/supabaseClient";

const NAVY = "#0B1F3A";
const BLUE = "#1877D6";

const QUICK_REPLIES: { label: string; body: string }[] = [
  { label: "Running late", body: "Hi {name}, I'm running about 10 minutes late for your lesson — see you shortly!" },
  { label: "On my way", body: "Hi {name}, I'm on my way to you now." },
  { label: "Outside now", body: "Hi {name}, I'm outside — whenever you're ready." },
  { label: "Confirm lesson", body: "Hi {name}, just confirming your lesson — are you still OK for it?" },
  { label: "Payment due", body: "Hi {name}, just a reminder that there's a payment outstanding for your lessons. Thanks!" },
  { label: "Well done", body: "Great work today {name} — really good progress. Keep it up!" },
  { label: "Cancel lesson", body: "Hi {name}, I'm sorry but I need to cancel your lesson. I'll be in touch to rearrange." },
  { label: "Reschedule", body: "Hi {name}, could we look at moving your lesson to another time? Let me know what suits." },
];

export interface SendMessageSheetProps {
  open: boolean;
  onClose: () => void;
  onSent?: () => void;
  initialPupilId?: string;
}

type DraftStatus = "empty" | "unsaved" | "saved" | "sent";

const DRAFT_KEY_PREFIX = "dsm.msgDraft.";

const DRAFT_UI: Record<DraftStatus, { label: string; color: string }> = {
  empty: { label: "No draft", color: "#8A93A3" },
  unsaved: { label: "Unsaved…", color: "#8A5A00" },
  saved: { label: "Draft saved", color: "#0F7B4F" },
  sent: { label: "Sent", color: "#1877D6" },
};

type SmsStatus = "idle" | "queued" | "sending" | "sent" | "failed";

const SMS_STATUS_UI: Record<
  Exclude<SmsStatus, "idle">,
  { label: string; detail: string; fg: string; bg: string; border: string }
> = {
  queued: {
    label: "Queued",
    detail: "Your text is waiting to be picked up for delivery.",
    fg: "#8A5A00",
    bg: "#FFF7EC",
    border: "#FCD9A8",
  },
  sending: {
    label: "Sending…",
    detail: "Handing the text to the SMS provider.",
    fg: "#1877D6",
    bg: "#EEF5FE",
    border: "#CFE1F7",
  },
  sent: {
    label: "Sent",
    detail: "The text was delivered to the provider.",
    fg: "#0F7B4F",
    bg: "#ECFAF3",
    border: "#B7E7CE",
  },
  failed: {
    label: "Failed",
    detail: "The text could not be sent — try again or call instead.",
    fg: "#CC2229",
    bg: "#FEF0F0",
    border: "#F8C9CB",
  },
};

interface PupilRow {
  id: string;
  name: string | null;
  phone: string | null;
}

const cardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #E2E8F0",
  borderRadius: 14,
  padding: 12,
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  marginBottom: 10,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 42,
  borderRadius: 10,
  border: "1px solid #E2E8F0",
  background: "#fff",
  padding: "0 12px",
  fontSize: 14,
  color: NAVY,
  outline: "none",
};

export function SendMessageSheet({
  open,
  onClose,
  onSent,
  initialPupilId,
}: SendMessageSheetProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [pupils, setPupils] = useState<PupilRow[]>([]);
  const [pupilId, setPupilId] = useState<string>(initialPupilId ?? "");
  const [pupilQuery, setPupilQuery] = useState("");
  const [pupilOpen, setPupilOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [sendSms, setSendSms] = useState(true);
  const [sending, setSending] = useState(false);
  const [pendingPupil, setPendingPupil] = useState<PupilRow | null>(null);
  const [smsStatus, setSmsStatus] = useState<SmsStatus>("idle");
  const [draftStatus, setDraftStatus] = useState<DraftStatus>("empty");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Reset when opened
  useEffect(() => {
    if (!open) return;
    setPupilId(initialPupilId ?? "");
    setPupilQuery("");
    setPupilOpen(false);
    setMessageText("");
    setSendSms(true);
    setSending(false);
    setPendingPupil(null);
    setSmsStatus("idle");
    setDraftStatus("empty");
    const t = setTimeout(() => textareaRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, [open, initialPupilId]);

  // Restore any saved draft for the selected pupil
  useEffect(() => {
    if (!open || !pupilId) return;
    try {
      const saved = window.localStorage.getItem(DRAFT_KEY_PREFIX + pupilId);
      if (saved) {
        setMessageText(saved);
        setDraftStatus("saved");
      }
    } catch {
      /* storage unavailable */
    }
  }, [open, pupilId]);

  // Autosave the draft (debounced) and reflect its state
  useEffect(() => {
    if (!open || !pupilId || draftStatus === "sent") return;
    const key = DRAFT_KEY_PREFIX + pupilId;
    if (!messageText.trim()) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
      setDraftStatus("empty");
      return;
    }
    let stored = "";
    try {
      stored = window.localStorage.getItem(key) ?? "";
    } catch {
      /* ignore */
    }
    if (stored === messageText) {
      setDraftStatus("saved");
      return;
    }
    setDraftStatus("unsaved");
    const t = setTimeout(() => {
      try {
        window.localStorage.setItem(key, messageText);
        setDraftStatus("saved");
      } catch {
        /* ignore */
      }
    }, 700);
    return () => clearTimeout(t);
  }, [messageText, pupilId, open, draftStatus]);

  // Stop polling when the sheet closes or unmounts
  useEffect(() => {
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [open]);

  // Load active pupils
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u?.user?.id;
      if (!uid) return;
      if (!cancelled) setUserId(uid);
      const { data, error } = await supabase
        .from("pupils")
        .select("id, name, phone")
        .eq("instructor_id", uid)
        .is("deleted_at", null)
        .not("status", "in", "(inactive,archived,cancelled)")
        .order("name");
      if (cancelled) return;
      if (error) {
        console.warn("[SendMessageSheet] load pupils", error);
        return;
      }
      setPupils((data ?? []) as PupilRow[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const selectedPupil = pupils.find((p) => p.id === pupilId) ?? null;
  const pupilName = selectedPupil?.name ?? "";
  const pupilPhone = selectedPupil?.phone ?? null;

  const filteredPupils = useMemo(() => {
    const q = pupilQuery.trim().toLowerCase();
    if (!q) return pupils;
    return pupils.filter((p) => (p.name ?? "").toLowerCase().includes(q));
  }, [pupils, pupilQuery]);

  function applyPupil(p: PupilRow) {
    setPupilId(p.id);
    setPupilOpen(false);
    setPupilQuery("");
    setSendSms(!!p.phone);
    setPendingPupil(null);
  }

  function insertTemplate(body: string) {
    const first = (pupilName || "").trim().split(" ")[0] || "there";
    const text = body.replace(/\{name\}/g, first);
    setMessageText((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text));
    textareaRef.current?.focus();
  }

  function watchSmsStatus(smsId: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    const startedAt = Date.now();
    pollRef.current = setInterval(async () => {
      const { data, error } = await supabase
        .from("sms_queue")
        .select("status, sent_at")
        .eq("id", smsId)
        .maybeSingle();

      const done = (next: SmsStatus) => {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
        setSmsStatus(next);
      };

      if (error) {
        console.warn("[SendMessageSheet] sms status poll", error);
        return;
      }
      const status = (data?.status ?? "").toLowerCase();
      if (status === "sent" || data?.sent_at) {
        done("sent");
        toast.success("Text delivered");
        return;
      }
      if (status === "failed" || status === "error") {
        done("failed");
        toast.error("Text failed to send");
        return;
      }
      if (Date.now() - startedAt > 30000) {
        // Still queued after 30s — leave it with the cron and stop polling
        done("queued");
      }
    }, 2000);
  }

  function clearDraft() {
    if (pupilId) {
      try {
        window.localStorage.removeItem(DRAFT_KEY_PREFIX + pupilId);
      } catch {
        /* ignore */
      }
    }
    setDraftStatus("sent");
  }

  async function handleSend() {
    const body = messageText.trim();
    if (!body || !pupilId || sending) return;
    const { data: u } = await supabase.auth.getUser();
    const uid = userId ?? u?.user?.id ?? null;
    if (!uid) {
      toast.error("Not signed in");
      return;
    }
    setSending(true);

    try {
      // 1. In-app chat message — same payload as messages.$pupilId.tsx
      const { error: chatErr } = await supabase.from("chat_messages").insert({
        instructor_id: uid,
        pupil_id: pupilId,
        sender_type: "instructor",
        sender_id: uid,
        body,
      });
      if (chatErr) throw chatErr;

      // 2. Optional SMS — same queue logic as gaps.tsx
      if (sendSms && pupilPhone) {
        const { data: smsRow, error: smsErr } = await supabase
          .from("sms_queue")
          .insert({
            instructor_id: uid,
            pupil_phone: pupilPhone,
            message: body,
          })
          .select("id")
          .single();
        if (smsErr) {
          console.error("[SendMessageSheet] sms_queue insert failed:", smsErr);
          setSmsStatus("failed");
          toast.error("Message sent, but the text failed to queue");
        } else {
          setSmsStatus("queued");
          // Fire and forget — don't wait for cron
          void supabase.functions.invoke("send-sms", { body: {} });
          setSmsStatus("sending");
          if (smsRow?.id) watchSmsStatus(smsRow.id as string);
        }

        toast.success("Message sent");
        onSent?.();
        clearDraft();
        // Keep the sheet open so delivery progress stays visible
        setMessageText("");
        return;
      }

      toast.success("Message sent");
      onSent?.();
      clearDraft();
      onClose();
    } catch (err) {
      console.error("[SendMessageSheet] send failed", err);
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  }

  if (!open) return null;

  const canSend = !!pupilId && messageText.trim().length > 0 && !sending;

  return (
    <BottomSheet
      title="Send a message"
      subtitle={pupilName || undefined}
      onClose={onClose}
      footer={
        smsStatus === "idle" ? (
          <PrimaryButton onClick={handleSend} disabled={!canSend}>
            {sending ? "Sending…" : "Send"}
          </PrimaryButton>
        ) : (
          <PrimaryButton onClick={onClose}>Done</PrimaryButton>
        )
      }
    >
      {/* SMS delivery status */}
      {smsStatus !== "idle" && (
        <div
          style={{
            ...cardStyle,
            background: SMS_STATUS_UI[smsStatus].bg,
            border: `1px solid ${SMS_STATUS_UI[smsStatus].border}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: SMS_STATUS_UI[smsStatus].fg,
                flexShrink: 0,
              }}
            />
            <div style={{ fontSize: 14, fontWeight: 700, color: SMS_STATUS_UI[smsStatus].fg }}>
              SMS {SMS_STATUS_UI[smsStatus].label}
            </div>
          </div>
          <div style={{ fontSize: 12, color: "#8A93A3", marginTop: 4 }}>
            {SMS_STATUS_UI[smsStatus].detail}
          </div>
        </div>
      )}

      {/* Pupil selector */}
      <div style={cardStyle}>
        <SectionLabel>PUPIL</SectionLabel>
        <button
          type="button"
          onClick={() => setPupilOpen((v) => !v)}
          style={{ ...inputStyle, textAlign: "left", cursor: "pointer" }}
        >
          {pupilName || "Select pupil"}
        </button>

        {selectedPupil && (
          <div style={{ marginTop: 6, fontSize: 12, color: "#8A93A3" }}>
            {pupilPhone || "No phone number"}
          </div>
        )}

        {pendingPupil && (
          <div
            style={{
              marginTop: 8,
              padding: 10,
              borderRadius: 10,
              border: "1px solid #FCD9A8",
              background: "#FFF7EC",
            }}
          >
            <div style={{ fontSize: 13, color: NAVY, fontWeight: 600 }}>
              Switch to {pendingPupil.name ?? "this pupil"}?
            </div>
            <div style={{ fontSize: 12, color: "#8A93A3", marginTop: 2 }}>
              Your unsent message will be kept, but it was written for{" "}
              {pupilName || "the current pupil"}.
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button
                type="button"
                onClick={() => applyPupil(pendingPupil)}
                style={{
                  flex: 1,
                  height: 36,
                  borderRadius: 10,
                  border: "none",
                  background: BLUE,
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Switch pupil
              </button>
              <button
                type="button"
                onClick={() => setPendingPupil(null)}
                style={{
                  flex: 1,
                  height: 36,
                  borderRadius: 10,
                  border: "1px solid #E2E8F0",
                  background: "#fff",
                  color: NAVY,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Keep current
              </button>
            </div>
          </div>
        )}

        {pupilOpen && (
          <div style={{ marginTop: 8 }}>
            <div style={{ position: "relative" }}>
              <Search
                size={14}
                style={{ position: "absolute", left: 10, top: 14, color: "#8A93A3" }}
              />
              <input
                autoFocus
                value={pupilQuery}
                onChange={(e) => setPupilQuery(e.target.value)}
                placeholder="Search pupils…"
                style={{ ...inputStyle, paddingLeft: 30 }}
              />
            </div>
            <div style={{ maxHeight: 200, overflowY: "auto", marginTop: 6 }}>
              {filteredPupils.length === 0 && (
                <div style={{ padding: 10, fontSize: 13, color: "#8A93A3" }}>No pupils found</div>
              )}
              {filteredPupils.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    if (pupilId && p.id !== pupilId && messageText.trim()) {
                      setPendingPupil(p);
                      return;
                    }
                    applyPupil(p);
                  }}
                  style={{
                    display: "flex",
                    width: "100%",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    padding: "10px 8px",
                    background: p.id === pupilId ? "#EEF5FE" : "transparent",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 14,
                    color: NAVY,
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <span>{p.name ?? "Pupil"}</span>
                  <span style={{ fontSize: 12, color: "#8A93A3" }}>
                    {p.phone || "No phone"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Message */}
      <div style={cardStyle}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <SectionLabel>MESSAGE</SectionLabel>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontSize: 11,
              fontWeight: 700,
              color: DRAFT_UI[draftStatus].color,
              marginBottom: 6,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: DRAFT_UI[draftStatus].color,
              }}
            />
            {DRAFT_UI[draftStatus].label}
          </div>
        </div>
        <textarea
          ref={textareaRef}
          rows={4}
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          placeholder="Type a message..."
          style={{
            width: "100%",
            borderRadius: 10,
            border: "1px solid #E2E8F0",
            background: "#fff",
            padding: 12,
            fontSize: 14,
            lineHeight: 1.45,
            color: NAVY,
            outline: "none",
            resize: "none",
          }}
        />

        {/* Quick replies */}
        <div style={{ marginTop: 10 }}>
          <SectionLabel>QUICK REPLIES</SectionLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {QUICK_REPLIES.map((t) => (
              <button
                key={t.label}
                type="button"
                onClick={() => insertTemplate(t.body)}
                style={{
                  padding: "7px 11px",
                  borderRadius: 999,
                  border: "1px solid #CFE1F7",
                  background: "#EEF5FE",
                  color: BLUE,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>


      {/* SMS toggle */}
      {pupilPhone && (
        <div style={{ ...cardStyle, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: NAVY }}>Send via SMS</div>
            <div style={{ fontSize: 12, color: "#8A93A3", marginTop: 2 }}>
              Also texts {pupilPhone}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSendSms((v) => !v)}
            aria-pressed={sendSms}
            style={{
              width: 48,
              height: 28,
              borderRadius: 999,
              border: "none",
              background: sendSms ? BLUE : "#CBD5E1",
              position: "relative",
              cursor: "pointer",
              flexShrink: 0,
              transition: "background 150ms ease",
            }}
          >
            <span
              style={{
                position: "absolute",
                top: 3,
                left: sendSms ? 23 : 3,
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: "#fff",
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                transition: "left 150ms ease",
              }}
            />
          </button>
        </div>
      )}
    </BottomSheet>
  );
}

export default SendMessageSheet;
