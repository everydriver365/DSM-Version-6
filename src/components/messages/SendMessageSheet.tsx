import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";

import { BottomSheet, PrimaryButton, SectionLabel } from "@/components/dsm/BottomSheetV2";
import { supabase } from "@/lib/supabaseClient";

const NAVY = "#0B1F3A";
const BLUE = "#1877D6";

export interface SendMessageSheetProps {
  open: boolean;
  onClose: () => void;
  onSent?: () => void;
  initialPupilId?: string;
}

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
    const t = setTimeout(() => textareaRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, [open, initialPupilId]);

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
        const { error: smsErr } = await supabase.from("sms_queue").insert({
          instructor_id: uid,
          pupil_phone: pupilPhone,
          message: body,
        });
        if (smsErr) {
          console.error("[SendMessageSheet] sms_queue insert failed:", smsErr);
          toast.error("Message sent, but the text failed to queue");
        } else {
          // Fire and forget — don't wait for cron
          void supabase.functions.invoke("send-sms", { body: {} });
        }
      }

      toast.success("Message sent");
      onSent?.();
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
        <PrimaryButton onClick={handleSend} disabled={!canSend}>
          {sending ? "Sending…" : "Send"}
        </PrimaryButton>
      }
    >
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
                    setPupilId(p.id);
                    setPupilOpen(false);
                    setPupilQuery("");
                    setSendSms(!!p.phone);
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
        <SectionLabel>MESSAGE</SectionLabel>
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
