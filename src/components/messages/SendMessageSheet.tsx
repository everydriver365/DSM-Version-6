import { tokens } from "@/lib/tokens";
import { useEffect, useMemo, useRef, useState } from "react";
import { IconChevronRight, IconMessageCircle2 } from "@tabler/icons-react";
import { toast } from "sonner";

import {
  Avatar,
  BottomSheet,
  PrimaryButton,
  SectionLabel,
  SheetDivider,
  SheetGroup,
  SheetRadio,
  SheetRow,
  SheetSearchRow,
} from "@/components/dsm/BottomSheetV2";
import { supabase } from "@/lib/supabaseClient";

const NAVY = "#0B1F3A";
const BLUE = "#1877D6";
const SUBTLE = "#6B7686";

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
  sent: { label: "Sent", color: tokens.blue },
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
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
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
    setActiveTemplate(null);
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

  function insertTemplate(label: string, body: string) {
    const first = (pupilName || "").trim().split(" ")[0] || "there";
    const text = body.replace(/\{name\}/g, first);
    setActiveTemplate(label);
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
            {sending ? "Sending…" : "Send message"}
          </PrimaryButton>
        ) : (
          <PrimaryButton onClick={onClose}>Done</PrimaryButton>
        )
      }
    >
      {/* SMS delivery status */}
      {smsStatus !== "idle" && (
        <SheetGroup>
          <div
            style={{
              padding: "15px 16px",
              background: SMS_STATUS_UI[smsStatus].bg,
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
              <div style={{ fontSize: tokens.fontSize.md, fontWeight: tokens.fontWeight.bold, color: SMS_STATUS_UI[smsStatus].fg }}>
                SMS {SMS_STATUS_UI[smsStatus].label}
              </div>
            </div>
            <div style={{ fontSize: 12, color: "#8A93A3", marginTop: 4 }}>
              {SMS_STATUS_UI[smsStatus].detail}
            </div>
          </div>
        </SheetGroup>
      )}

      {/* Section 1 — pupil selector */}
      <SectionLabel>PUPIL</SectionLabel>
      <SheetGroup>
        <SheetRow onClick={() => setPupilOpen((v) => !v)}>
          {selectedPupil ? (
            <Avatar name={pupilName || "?"} id={pupils.findIndex((p) => p.id === pupilId)} />
          ) : (
            <div
              className="flex items-center justify-center rounded-full shrink-0"
              style={{ width: 40, height: 40, backgroundColor: tokens.canvas, color: SUBTLE }}
            >
              <IconMessageCircle2 size={18} />
            </div>
          )}
          <div className="flex-1 min-w-0 text-left">
            <div style={{ fontSize: tokens.fontSize.lg, fontWeight: tokens.fontWeight.semibold, color: NAVY }}>
              {pupilName || "Select pupil"}
            </div>
            {selectedPupil && (
              <div style={{ fontSize: tokens.fontSize.base, fontWeight: tokens.fontWeight.medium, color: SUBTLE }}>
                {pupilPhone || "No phone number"}
              </div>
            )}
          </div>
          <IconChevronRight size={18} color={SUBTLE} style={{ flexShrink: 0 }} />
        </SheetRow>

        {pupilOpen && (
          <>
            <SheetDivider />
            <SheetSearchRow value={pupilQuery} onChange={setPupilQuery} placeholder="Search pupils…" />
            <SheetDivider />
            <div style={{ maxHeight: 220, overflowY: "auto" }}>
              {filteredPupils.length === 0 && (
                <div style={{ padding: "15px 16px", fontSize: tokens.fontSize.base, color: SUBTLE }}>No pupils found</div>
              )}
              {filteredPupils.map((p, idx) => (
                <div key={p.id}>
                  {idx > 0 && <SheetDivider />}
                  <SheetRow
                    selected={p.id === pupilId}
                    onClick={() => {
                      if (pupilId && p.id !== pupilId && messageText.trim()) {
                        setPendingPupil(p);
                        return;
                      }
                      applyPupil(p);
                    }}
                  >
                    <SheetRadio selected={p.id === pupilId} />
                    <div className="flex-1 min-w-0 text-left">
                      <div style={{ fontSize: 15, fontWeight: tokens.fontWeight.semibold, color: NAVY }}>{p.name ?? "Pupil"}</div>
                    </div>
                    <div style={{ fontSize: 12, color: SUBTLE }}>{p.phone || "No phone"}</div>
                  </SheetRow>
                </div>
              ))}
            </div>
          </>
        )}
      </SheetGroup>

      {pendingPupil && (
        <SheetGroup>
          <div style={{ padding: "15px 16px" }}>
            <div style={{ fontSize: tokens.fontSize.md, fontWeight: tokens.fontWeight.semibold, color: NAVY }}>
              Switch to {pendingPupil.name ?? "this pupil"}?
            </div>
            <div style={{ fontSize: tokens.fontSize.base, color: SUBTLE, marginTop: 2 }}>
              Your unsent message will be kept, but it was written for{" "}
              {pupilName || "the current pupil"}.
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button
                type="button"
                onClick={() => applyPupil(pendingPupil)}
                style={{
                  flex: 1,
                  height: 40,
                  borderRadius: 12,
                  border: "none",
                  background: BLUE,
                  color: "#fff",
                  fontSize: tokens.fontSize.base,
                  fontWeight: tokens.fontWeight.bold,
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
                  height: 40,
                  borderRadius: 12,
                  border: "1px solid #E2E8F0",
                  background: "#fff",
                  color: NAVY,
                  fontSize: tokens.fontSize.base,
                  fontWeight: tokens.fontWeight.bold,
                  cursor: "pointer",
                }}
              >
                Keep current
              </button>
            </div>
          </div>
        </SheetGroup>
      )}

      {/* Section 2 — message templates */}
      <SectionLabel>QUICK REPLIES</SectionLabel>
      <SheetGroup>
        {QUICK_REPLIES.map((t, idx) => (
          <div key={t.label}>
            {idx > 0 && <SheetDivider />}
            <SheetRow selected={activeTemplate === t.label} onClick={() => insertTemplate(t.label, t.body)}>
              <SheetRadio selected={activeTemplate === t.label} />
              <div className="flex-1 min-w-0 text-left" style={{ fontSize: 15, fontWeight: tokens.fontWeight.semibold, color: NAVY }}>
                {t.label}
              </div>
            </SheetRow>
          </div>
        ))}
      </SheetGroup>

      {/* Section 3 — compose */}
      <div className="flex items-center justify-between">
        <SectionLabel>MESSAGE</SectionLabel>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: tokens.fontSize.sm,
            fontWeight: tokens.fontWeight.bold,
            color: DRAFT_UI[draftStatus].color,
            marginBottom: 8,
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
      <SheetGroup>
        <div style={{ padding: "15px 16px" }}>
          <textarea
            ref={textareaRef}
            rows={4}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Type a message..."
            className="w-full focus:outline-none"
            style={{
              fontFamily: "Poppins, sans-serif",
              fontSize: 15,
              lineHeight: 1.45,
              color: NAVY,
              resize: "none",
              background: "transparent",
            }}
          />
        </div>
      </SheetGroup>

      {/* SMS toggle */}
      {pupilPhone && (
        <SheetGroup>
          <SheetRow>
            <div className="flex-1 min-w-0">
              <div style={{ fontSize: tokens.fontSize.lg, fontWeight: tokens.fontWeight.semibold, color: NAVY }}>Send via SMS</div>
              <div style={{ fontSize: tokens.fontSize.base, fontWeight: tokens.fontWeight.medium, color: SUBTLE, marginTop: 2 }}>
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
          </SheetRow>
        </SheetGroup>
      )}
    </BottomSheet>
  );
}

export default SendMessageSheet;
