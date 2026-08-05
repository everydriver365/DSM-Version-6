import React, { Fragment, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { MapPin, Pencil } from "lucide-react";
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconCalendar,
  IconClock,
  IconNotes,
  IconTrash,
  IconX,
  IconCircleCheck,
  IconClipboardList,
  IconClockExclamation,
  IconCurrentLocation,
  IconMessage,
  IconNavigation,
  IconPencil,
  IconPhone,
  IconCreditCard,
  IconRoute,
} from "@tabler/icons-react";

import { BottomSheet } from "@/components/dsm/BottomSheetV2";
import { SendMessageSheet } from "@/components/messages/SendMessageSheet";
import { UnifiedPaymentSheet } from "@/components/payments/UnifiedPaymentSheet";
import { supabase } from "@/lib/supabaseClient";
import { verifyAddress } from "@/lib/geocode.functions";

export interface LessonRow {
  id: string;
  lesson_date: string;
  lesson_time: string;
  duration_minutes: number | null;
  status: string;
  pupil_id: string;
  notes?: string | null;
  lesson_type?: string | null;
  payment_status?: string | null;
  eol_completed?: boolean | null;
  amount_due?: number | null;
  pickup_location?: string | null;
  pupils?: {
    name: string;
    phone?: string | null;
    postcode?: string | null;
    address?: string | null;
    prepaid_hours?: number | null;
    profile_image_url?: string | null;
  } | null;
}

export interface PrevLessonRow {
  id: string;
  lesson_date: string;
  status: string;
  notes: string | null;
}

export interface LessonActionsSheetProps {
  open: boolean;
  onClose: () => void;
  lesson: LessonRow;
  prev: PrevLessonRow | null;
  goingActive: boolean;
  setGoingActive: (v: boolean) => void;
  onOpenLate: () => void;
  onOpenLesson: () => void;
  onEol: () => void;
  userId: string | null;
}

const NAVY = "#0B1F3A";

function formatLessonTime(time: string): string {
  const [hStr, mStr] = (time ?? "00:00").split(":");
  const h = Number(hStr) || 0;
  const m = Number(mStr) || 0;
  const period = h >= 12 ? "pm" : "am";
  const dh = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return m === 0 ? `${dh}${period}` : `${dh}:${String(m).padStart(2, "0")}${period}`;
}

export function LessonActionsSheet({
  open,
  onClose,
  lesson,
  prev,
  goingActive,
  setGoingActive,
  onOpenLate,
  onOpenLesson,
  onEol,
  userId,
}: LessonActionsSheetProps) {
  const navigate = useNavigate();
  const verifyAddressFn = useServerFn(verifyAddress);
  const phone = lesson.pupils?.phone ?? null;
  const pupilName = lesson.pupils?.name ?? "Pupil";
  const firstName = pupilName.split(/\s+/)[0];
  const balance = Number(lesson.amount_due ?? 0);

  const [messageOpen, setMessageOpen] = useState(false);
  const [unifiedPayOpen, setUnifiedPayOpen] = useState(false);

  // --- Inline editing views ---
  type InlineView = "main" | "reschedule" | "duration" | "note" | "cancel" | "delete";
  const [inlineView, setInlineView] = useState<InlineView>("main");
  const [newDate, setNewDate] = useState(lesson.lesson_date);
  const [newTime, setNewTime] = useState((lesson.lesson_time ?? "").slice(0, 5));
  const [newDuration, setNewDuration] = useState(lesson.duration_minutes ?? 60);
  const [noteText, setNoteText] = useState(lesson.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [cancelReason, setCancelReason] = useState<string>("");
  const [cancelNote, setCancelNote] = useState("");
  const [chargeOption, setChargeOption] = useState<"none" | "fee" | "full">("none");
  const [cancelFee, setCancelFee] = useState("");

  const CANCEL_REASONS: string[] = [
    "Pupil cancelled",
    "Instructor cancelled",
    "Weather",
    "Vehicle issue",
    "Pupil no show",
    "Admin",
    "Other",
  ];
  const cancelLabel: React.CSSProperties = {
    fontFamily: "Poppins, sans-serif",
    fontSize: 10,
    fontWeight: 600,
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    margin: "14px 0 8px",
  };
  const chargeRow = (sel: boolean, bg: string, bc: string): React.CSSProperties => ({
    width: "100%",
    textAlign: "left",
    background: sel ? bg : "#fff",
    border: `1px solid ${sel ? bc : "#E4E8EF"}`,
    borderRadius: 8,
    padding: "10px 14px",
    cursor: "pointer",
  });
  const chargeTitle: React.CSSProperties = {
    fontFamily: "Poppins, sans-serif",
    fontSize: 13,
    fontWeight: 600,
    color: "#0B1F3A",
  };
  const chargeSub: React.CSSProperties = {
    fontFamily: "Poppins, sans-serif",
    fontSize: 11,
    color: "#6B7686",
    marginTop: 2,
  };

  const formatDate = (d: string) =>
    new Date(`${d}T00:00:00`).toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });

  const backLink: React.CSSProperties = {
    fontSize: 12,
    color: "#1877D6",
    background: "none",
    border: "none",
    padding: "8px 0",
    cursor: "pointer",
    fontFamily: "Inter, sans-serif",
  };
  const inlineHeading: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 600,
    color: NAVY,
    fontFamily: "Inter, sans-serif",
    margin: "4px 0 10px",
  };
  const primaryBtn: React.CSSProperties = {
    marginTop: 12,
    width: "100%",
    background: "#1877D6",
    color: "#FFFFFF",
    border: "none",
    borderRadius: 10,
    padding: "12px 0",
    fontFamily: "Inter, sans-serif",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  };
  const greyBtn: React.CSSProperties = {
    marginTop: 8,
    width: "100%",
    background: "#F5F7FA",
    color: NAVY,
    border: "1px solid #E2E8F0",
    borderRadius: 10,
    padding: "12px 0",
    fontFamily: "Inter, sans-serif",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  };


  const sendSms = (body: string) => {
    if (!phone) {
      toast("No phone number");
      return;
    }
    window.location.href = `sms:${phone}?&body=${encodeURIComponent(body)}`;
  };

  const pillLabel: React.CSSProperties = { fontSize: 11, fontWeight: 500 };
  const sectionLabel: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: "#8E8E93",
    textTransform: "uppercase",
    letterSpacing: 0.2,
    marginBottom: 6,
    fontFamily: "Inter, sans-serif",
  };

  // --- Pickup address (home address default, editable alternative) ---
  const homeAddress = lesson.pupils?.address ?? "";
  const [pickupValue, setPickupValue] = useState<string>(lesson.pickup_location ?? homeAddress);
  const [pickupState, setPickupState] = useState<"idle" | "checking" | "ok" | "bad">("idle");
  const [isEditingPickup, setIsEditingPickup] = useState(false);
  // The address string the current pickupState was computed for — keeps the
  // verified/unverified line visible after a save + refetch echoes the value back.
  const verifiedForRef = useRef<string | null>(null);

  // --- what3words (manual entry, 3 boxes) ---
  const [w3w, setW3w] = useState<[string, string, string]>(["", "", ""]);
  const [w3wState, setW3wState] = useState<"idle" | "checking" | "ok" | "bad">("idle");

  const lessonIdRef = useRef(lesson.id);
  const pickupValueRef = useRef(pickupValue);
  pickupValueRef.current = pickupValue;
  useEffect(() => {
    const incoming = lesson.pickup_location ?? homeAddress;
    const lessonChanged = lessonIdRef.current !== lesson.id;
    lessonIdRef.current = lesson.id;
    // Same lesson: only adopt the incoming value if it genuinely differs from
    // what we're showing (i.e. changed elsewhere) — a refetch echoing back the
    // value we just saved must not wipe the verification result.
    if (!lessonChanged && pickupValueRef.current.trim() === incoming.trim()) return;
    setPickupValue(incoming);
    setPickupState("idle");
    verifiedForRef.current = null;
    if (lessonChanged) setIsEditingPickup(false);
  }, [lesson.id, lesson.pickup_location, homeAddress]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("pupils")
        .select("what3words")
        .eq("id", lesson.pupil_id)
        .maybeSingle();
      const raw = (data as { what3words?: string | null } | null)?.what3words ?? "";
      if (cancelled || !raw) return;
      const parts = String(raw).replace(/^\/+/, "").split(".");
      if (parts.length === 3) setW3w([parts[0], parts[1], parts[2]]);
    })();
    return () => {
      cancelled = true;
    };
  }, [lesson.pupil_id]);

  const verifyAndSavePickup = async () => {
    if (pickupState === "checking") return;
    const address = pickupValue.trim();
    if (!address) {
      setPickupState("idle");
      verifiedForRef.current = null;
      setPickupValue(homeAddress);
      setIsEditingPickup(false);
      if (lesson.pickup_location) {
        const { error } = await supabase
          .from("lessons")
          .update({ pickup_location: null })
          .eq("id", lesson.id);
        if (error) {
          console.error("[pickup] clear failed", error);
          toast("Couldn't save pickup");
        } else toast("Pickup reset to home address");
      }
      return;
    }
    setPickupState("checking");
    verifiedForRef.current = address;
    // Give Google postcode context so house-number-only entries resolve.
    const postcode = (lesson.pupils?.postcode ?? "").trim();
    const query =
      postcode && !address.toUpperCase().includes(postcode.toUpperCase())
        ? `${address}, ${postcode}`
        : address;
    let verified = false;
    let addressToSave = address;
    try {
      const res = await verifyAddressFn({ data: { address: query } });
      verified = Boolean(res?.verified);
      if (verified && res?.formattedAddress) {
        addressToSave = res.formattedAddress;
        setPickupValue(addressToSave);
        verifiedForRef.current = addressToSave;
      }
      if (!verified && res?.reason) console.warn("[pickup] not verified:", res.reason);
    } catch (e) {
      console.warn("[pickup] geocode failed", e);
    }
    setPickupState(verified ? "ok" : "bad");
    const nextPickupLocation = addressToSave.trim() === homeAddress.trim() ? null : addressToSave;
    if ((nextPickupLocation ?? "") !== (lesson.pickup_location ?? "")) {
      const { error } = await supabase
        .from("lessons")
        .update({ pickup_location: nextPickupLocation })
        .eq("id", lesson.id);
      if (error) {
        console.error("[pickup] save failed", error);
        toast("Couldn't save pickup");
      } else toast("Pickup saved");
    }
    setIsEditingPickup(false);
  };

  const verifyAndSaveW3w = async () => {
    const [a, b, c] = w3w.map((s) => s.trim().toLowerCase());
    if (!a || !b || !c) {
      setW3wState("idle");
      return;
    }
    const words = `${a}.${b}.${c}`;
    setW3wState("checking");
    let verified = false;
    try {
      const key = import.meta.env.VITE_W3W_API_KEY as string | undefined;
      const r = await fetch(
        `https://api.what3words.com/v3/convert-to-coordinates?words=${encodeURIComponent(words)}&key=${key ?? ""}`,
      );
      const j = await r.json();
      verified = Boolean(j?.coordinates);
    } catch (e) {
      console.warn("[w3w] lookup failed", e);
    }
    setW3wState(verified ? "ok" : "bad");
    const { error } = await supabase
      .from("pupils")
      .update({ what3words: words })
      .eq("id", lesson.pupil_id);
    if (error) {
      console.error("[w3w] save failed", error);
      toast("Couldn't save what3words");
    }
  };

  const gridBtn: React.CSSProperties = {
    background: "#F5F7FA",
    border: "1px solid #E2E8F0",
    borderRadius: 12,
    padding: "10px 4px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    cursor: "pointer",
    fontFamily: "Inter, sans-serif",
    fontSize: 11,
    fontWeight: 500,
    color: NAVY,
  };
  const gridBtnDanger: React.CSSProperties = {
    ...gridBtn,
    background: "#FCE9E9",
    border: "1px solid #F5CBCB",
    color: "#CC2229",
  };
  const fieldInput: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    background: "#FFFFFF",
    border: "1px solid #E2E8F0",
    borderRadius: 10,
    padding: "9px 12px",
    fontFamily: "Inter, sans-serif",
    fontSize: 13,
    color: NAVY,
    outline: "none",
  };

  const statusLine = (
    state: "idle" | "checking" | "ok" | "bad",
    okText: string,
    badText: string,
  ) => {
    if (state === "checking") {
      return (
        <div style={{ marginTop: 6, fontSize: 11, color: "#8E8E93", fontFamily: "Inter, sans-serif" }}>
          Checking…
        </div>
      );
    }
    if (state === "ok") {
      return (
        <div
          style={{
            marginTop: 6,
            display: "flex",
            alignItems: "center",
            gap: 5,
            fontSize: 11,
            color: "#1F6B2E",
            fontFamily: "Inter, sans-serif",
          }}
        >
          <IconCircleCheck size={14} stroke={1.8} /> {okText}
        </div>
      );
    }
    if (state === "bad") {
      return (
        <div
          style={{
            marginTop: 6,
            display: "flex",
            alignItems: "center",
            gap: 5,
            fontSize: 11,
            color: "#B45309",
            fontFamily: "Inter, sans-serif",
          }}
        >
          <IconAlertTriangle size={14} stroke={1.8} /> {badText}
        </div>
      );
    }
    return (
      <div style={{ marginTop: 6, fontSize: 11, color: "#8E8E93", fontFamily: "Inter, sans-serif" }}>
        Not yet verified
      </div>
    );
  };

  // --- Header payment pill ---
  const payStatus = (lesson.payment_status ?? "unpaid").toLowerCase();
  const payPill = (() => {
    if (payStatus === "paid") return { label: "Paid", fg: "#1F6B2E", bg: "#E8F5E9" };
    if (payStatus === "prepaid") return { label: "Prepaid", fg: "#1F6B2E", bg: "#E8F5E9" };
    if (payStatus === "cancelled") return { label: "Cancelled", fg: "#5A6270", bg: "#E9EDF2" };
    if (balance > 0) return { label: `Due £${balance.toFixed(2)}`, fg: "#CC2229", bg: "#FCE9E9" };
    return null;
  })();

  const dateLabel = new Date(`${lesson.lesson_date}T00:00:00`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const timeLabel = formatLessonTime((lesson.lesson_time ?? "").slice(0, 5));
  const durationLabel = lesson.duration_minutes ? ` · ${lesson.duration_minutes} min` : "";

  if (!open) return null;

  return (
    <>
      <BottomSheet title="Lesson" onClose={onClose}>
        {/* HEADER */}
        <div style={{ padding: "0 4px 10px", borderBottom: "1px solid #E3E7ED", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, color: NAVY }}>
              {pupilName}
            </span>
            {payPill && (
              <span
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 11,
                  fontWeight: 600,
                  color: payPill.fg,
                  background: payPill.bg,
                  borderRadius: 999,
                  padding: "3px 10px",
                  whiteSpace: "nowrap",
                }}
              >
                {payPill.label}
              </span>
            )}
          </div>
          <div style={{ marginTop: 3, fontFamily: "Inter, sans-serif", fontSize: 11, color: "#8E8E93" }}>
            {dateLabel} · {timeLabel}
            {durationLabel}
          </div>
        </div>

        {inlineView !== "main" && (
          <button type="button" onClick={() => setInlineView("main")} style={backLink}>
            ← Back
          </button>
        )}

        {inlineView === "reschedule" && (
          <div style={{ paddingBottom: 12 }}>
            <div style={inlineHeading}>Reschedule lesson</div>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              style={{ ...fieldInput, width: "100%", marginBottom: 8 }}
            />
            <input
              type="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              style={{ ...fieldInput, width: "100%" }}
            />
            <button
              type="button"
              disabled={saving}
              style={primaryBtn}
              onClick={async () => {
                setSaving(true);
                await supabase
                  .from("lessons")
                  .update({ lesson_date: newDate, lesson_time: newTime })
                  .eq("id", lesson.id);
                toast.success(`Lesson moved to ${formatDate(newDate)} at ${newTime}`);
                setSaving(false);
                onClose();
                navigate({ to: "/home" });
              }}
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        )}

        {inlineView === "duration" && (
          <div style={{ paddingBottom: 12 }}>
            <div style={inlineHeading}>Change duration</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
              {[45, 60, 90, 120].map((d) => {
                const sel = newDuration === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setNewDuration(d)}
                    style={{
                      ...gridBtn,
                      padding: "10px 2px",
                      background: sel ? "#1877D6" : "#FFFFFF",
                      border: `1px solid ${sel ? "#1877D6" : "#E2E8F0"}`,
                      color: sel ? "#FFFFFF" : NAVY,
                    }}
                  >
                    <span style={pillLabel}>{d} min</span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              disabled={saving}
              style={primaryBtn}
              onClick={async () => {
                setSaving(true);
                await supabase
                  .from("lessons")
                  .update({ duration_minutes: newDuration })
                  .eq("id", lesson.id);
                toast.success(`Duration updated to ${newDuration} mins`);
                setSaving(false);
                onClose();
                navigate({ to: "/home" });
              }}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        )}

        {inlineView === "note" && (
          <div style={{ paddingBottom: 12 }}>
            <div style={inlineHeading}>Add note</div>
            <textarea
              rows={4}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add a note about this lesson..."
              style={{
                width: "100%",
                border: "1px solid #E4E8EF",
                borderRadius: 8,
                fontFamily: "Poppins, sans-serif",
                fontSize: 13,
                padding: 10,
                color: NAVY,
                outline: "none",
                resize: "vertical",
              }}
            />
            <button
              type="button"
              disabled={saving}
              style={primaryBtn}
              onClick={async () => {
                setSaving(true);
                await supabase
                  .from("lessons")
                  .update({ notes: noteText.trim() })
                  .eq("id", lesson.id);
                toast.success("Note saved");
                setSaving(false);
                onClose();
                navigate({ to: "/home" });
              }}
            >
              {saving ? "Saving…" : "Save note"}
            </button>
          </div>
        )}

        {inlineView === "cancel" && (
          <div style={{ paddingBottom: 12, textAlign: "left" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <IconAlertCircle size={20} stroke={1.8} color="#CC2229" />
              <div style={{ ...inlineHeading, color: "#CC2229", margin: 0 }}>
                Cancel lesson with {pupilName}
              </div>
            </div>

            {/* SECTION 1 — Reason */}
            <div style={cancelLabel}>Reason for cancellation</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {CANCEL_REASONS.map((r) => {
                const sel = cancelReason === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setCancelReason(r)}
                    style={{
                      background: sel ? "#0B1F3A" : "#F1F5F9",
                      color: sel ? "#fff" : "#6B7686",
                      borderRadius: 20,
                      padding: "6px 14px",
                      fontFamily: "Poppins, sans-serif",
                      fontSize: 12,
                      fontWeight: sel ? 600 : 500,
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    {r}
                  </button>
                );
              })}
            </div>

            {/* SECTION 2 — Notes */}
            <div style={cancelLabel}>Notes</div>
            <textarea
              rows={3}
              value={cancelNote}
              onChange={(e) => setCancelNote(e.target.value)}
              placeholder="Add any additional notes..."
              style={{
                width: "100%",
                border: "1px solid #E4E8EF",
                borderRadius: 8,
                fontFamily: "Poppins, sans-serif",
                fontSize: 13,
                padding: 10,
                boxSizing: "border-box",
                resize: "vertical",
              }}
            />

            {/* SECTION 3 — Charge */}
            <div style={cancelLabel}>Charge</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                type="button"
                onClick={() => setChargeOption("none")}
                style={chargeRow(chargeOption === "none", "#E6F1FB", "#1877D6")}
              >
                <div style={chargeTitle}>No charge</div>
                <div style={chargeSub}>
                  {payStatus === "paid" || payStatus === "partial"
                    ? `£${balance.toFixed(2)} refunded as account credit`
                    : payStatus === "prepaid"
                      ? "1 lesson returned to prepaid hours"
                      : "No payment to refund"}
                </div>
              </button>

              <div>
                <button
                  type="button"
                  onClick={() => setChargeOption("fee")}
                  style={chargeRow(chargeOption === "fee", "#FEF3C7", "#D97706")}
                >
                  <div style={chargeTitle}>Charge cancellation fee</div>
                  <div style={chargeSub}>Remainder refunded to account credit</div>
                </button>
                {chargeOption === "fee" && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
                    <span style={{ fontFamily: "Poppins, sans-serif", fontSize: 13, color: "#6B7686" }}>£</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={cancelFee}
                      onChange={(e) => setCancelFee(e.target.value)}
                      placeholder="e.g. 20.00"
                      style={{
                        flex: 1,
                        border: "1px solid #E4E8EF",
                        borderRadius: 8,
                        padding: "10px 12px",
                        fontFamily: "Poppins, sans-serif",
                        fontSize: 13,
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                )}
              </div>

              {(payStatus === "paid" || payStatus === "partial") && (
                <button
                  type="button"
                  onClick={() => setChargeOption("full")}
                  style={chargeRow(chargeOption === "full", "#FCE9E9", "#CC2229")}
                >
                  <div style={chargeTitle}>Charge full lesson</div>
                  <div style={chargeSub}>No refund — full payment retained</div>
                </button>
              )}
            </div>

            <button
              type="button"
              disabled={saving || !cancelReason}
              style={{
                ...primaryBtn,
                background: "#CC2229",
                opacity: !cancelReason || saving ? 0.5 : 1,
              }}
              onClick={async () => {
                setSaving(true);
                await supabase
                  .from("lessons")
                  .update({
                    status: "cancelled",
                    payment_status: "cancelled",
                    notes: [lesson.notes, cancelReason, cancelNote].filter(Boolean).join(" · "),
                  })
                  .eq("id", lesson.id);

                const { recordRefund } = await import("@/lib/payments");
                if (chargeOption === "none" && (payStatus === "paid" || payStatus === "partial")) {
                  await recordRefund({
                    pupilId: lesson.pupil_id,
                    amount: Number(lesson.amount_due ?? 0),
                    method: "cash",
                    notes: `Cancellation refund — ${cancelReason}`,
                    currentAccountBalance: 0,
                  });
                } else if (chargeOption === "fee") {
                  const fee = Number(cancelFee) || 0;
                  const refund = Number(lesson.amount_due ?? 0) - fee;
                  if (refund > 0) {
                    await recordRefund({
                      pupilId: lesson.pupil_id,
                      amount: refund,
                      method: "cash",
                      notes: `Partial refund — cancellation fee £${fee} retained`,
                      currentAccountBalance: 0,
                    });
                  }
                } else if (chargeOption === "full") {
                  await supabase.from("lesson_history").insert({
                    instructor_id: (lesson as any).instructor_id,
                    pupil_id: lesson.pupil_id,
                    amount_paid: Number(lesson.amount_due ?? 0),
                    payment_method: (lesson as any).payment_method ?? "cash",
                    payment_status: "paid",
                    notes: `Full charge retained — ${cancelReason}`,
                    created_at: new Date().toISOString(),
                  } as never);
                }

                toast.success("Lesson cancelled");
                setSaving(false);
                onClose();
                navigate({ to: "/home" });
              }}
            >
              {saving ? "Cancelling…" : "Confirm cancellation"}
            </button>
            <button
              type="button"
              style={greyBtn}
              onClick={() => {
                setInlineView("main");
                setCancelReason("");
                setCancelNote("");
                setChargeOption("none");
                setCancelFee("");
              }}
            >
              Keep lesson
            </button>
          </div>
        )}

        {inlineView === "delete" && (
          <div style={{ paddingBottom: 12, textAlign: "center" }}>
            <IconTrash size={24} stroke={1.8} color="#CC2229" />
            <div style={{ ...inlineHeading, color: "#CC2229", textAlign: "center" }}>
              Delete this lesson?
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "#9CA3AF" }}>
              This cannot be undone
            </div>
            <button
              type="button"
              disabled={saving}
              style={{ ...primaryBtn, background: "#CC2229" }}
              onClick={async () => {
                setSaving(true);
                await supabase
                  .from("lessons")
                  .update({ deleted_at: new Date().toISOString() })
                  .eq("id", lesson.id);
                toast.success("Lesson deleted");
                setSaving(false);
                onClose();
                navigate({ to: "/home" });
              }}
            >
              {saving ? "Deleting…" : "Confirm delete"}
            </button>
            <button type="button" style={greyBtn} onClick={() => setInlineView("main")}>
              Cancel
            </button>
          </div>
        )}

        {inlineView === "main" && (
        <>
        {/* Quick Actions */}

        <div style={sectionLabel}>Quick Actions</div>

        {/* Row 1 — Navigate / Message / Call */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <button
            type="button"
            style={{ ...gridBtn, background: goingActive ? "#FFF8E8" : "#FFFFFF" }}
            onClick={() => {
              setGoingActive(true);
              sendSms(`Hi ${firstName}, on the way!`);
            }}
          >
            <IconNavigation size={18} stroke={1.8} color={NAVY} />
            <span style={pillLabel}>Navigate</span>
          </button>
          <button
            type="button"
            style={{ ...gridBtn, background: "#FFFFFF" }}
            onClick={(e) => {
              e.stopPropagation();
              setMessageOpen(true);
            }}
          >
            <IconMessage size={18} stroke={1.8} color={NAVY} />
            <span style={pillLabel}>Message</span>
          </button>
          <button
            type="button"
            style={{ ...gridBtn, background: "#FFFFFF" }}
            onClick={(e) => {
              e.stopPropagation();
              if (!phone) {
                toast("No phone number");
                return;
              }
              window.location.href = `tel:${phone}`;
            }}
          >
            <IconPhone size={18} stroke={1.8} color={NAVY} />
            <span style={pillLabel}>Call</span>
          </button>
        </div>

        {/* Row 2 — Track / Running late / I'm here */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 8 }}>
          <button
            type="button"
            style={{ ...gridBtn, background: "#E6F1FB", border: "1px solid #CFE1F7", color: "#1877D6" }}
            onClick={(e) => {
              e.stopPropagation();
              navigate({
                to: "/live",
                search: { autostart: "1", lessonId: lesson.id, pupilId: lesson.pupil_id },
              } as never);
            }}
          >
            <IconRoute size={18} stroke={1.8} color="#1877D6" />
            <span style={{ ...pillLabel, color: "#1877D6" }}>Track</span>
          </button>
          <button type="button" style={gridBtnDanger} onClick={onOpenLate}>
            <IconClockExclamation size={18} stroke={1.8} color="#CC2229" />
            <span style={{ ...pillLabel, color: "#CC2229" }}>Running late</span>
          </button>
          <button
            type="button"
            style={{ ...gridBtn, background: "#E8F5E9" }}
            onClick={() => sendSms(`Hi ${firstName}, I'm outside whenever you're ready 👋`)}
          >
            <IconCurrentLocation size={18} stroke={1.8} color={NAVY} />
            <span style={pillLabel}>I'm here</span>
          </button>
        </div>

        {/* Row 3 — Payment / Prep / Edit */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 8 }}>
          <button
            type="button"
            style={{ ...gridBtn, background: "#FFFFFF" }}
            onClick={(e) => {
              e.stopPropagation();
              setUnifiedPayOpen(true);
            }}
          >
            <IconCreditCard size={18} stroke={1.8} color={NAVY} />
            <span style={pillLabel}>Payment</span>
          </button>
          <button type="button" style={{ ...gridBtn, background: "#FFFFFF" }} onClick={onOpenLesson}>
            <IconClipboardList size={18} stroke={1.8} color={NAVY} />
            <span style={pillLabel}>Prep</span>
          </button>
          <button
            type="button"
            style={{ ...gridBtn, background: "#FFFFFF" }}
            onClick={() => navigate({ to: "/lessons/edit/$id", params: { id: lesson.id } })}
          >
            <IconPencil size={18} stroke={1.8} color={NAVY} />
            <span style={pillLabel}>Edit</span>
          </button>
        </div>

        {/* Row 4 — Reschedule / Duration / Add note */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 8 }}>
          <button
            type="button"
            style={{ ...gridBtn, background: "#FFFFFF" }}
            onClick={() => setInlineView("reschedule")}
          >
            <IconCalendar size={18} stroke={1.8} color={NAVY} />
            <span style={pillLabel}>Reschedule</span>
          </button>
          <button
            type="button"
            style={{ ...gridBtn, background: "#FFFFFF" }}
            onClick={() => setInlineView("duration")}
          >
            <IconClock size={18} stroke={1.8} color={NAVY} />
            <span style={pillLabel}>Duration</span>
          </button>
          <button
            type="button"
            style={{ ...gridBtn, background: "#FFFFFF" }}
            onClick={() => setInlineView("note")}
          >
            <IconNotes size={18} stroke={1.8} color={NAVY} />
            <span style={pillLabel}>Add note</span>
          </button>
        </div>

        {/* Row 5 — destructive */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
          <button
            type="button"
            style={{ ...gridBtnDanger, fontWeight: 600 }}
            onClick={() => setInlineView("cancel")}
          >
            <IconX size={18} stroke={1.8} color="#CC2229" />
            <span style={{ ...pillLabel, fontWeight: 600, color: "#CC2229" }}>Cancel lesson</span>
          </button>
          <button
            type="button"
            style={{ ...gridBtnDanger, fontWeight: 600 }}
            onClick={() => setInlineView("delete")}
          >
            <IconTrash size={18} stroke={1.8} color="#CC2229" />
            <span style={{ ...pillLabel, fontWeight: 600, color: "#CC2229" }}>Delete lesson</span>
          </button>
        </div>


        {/* End of lesson — full width */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEol();
          }}
          style={{
            marginTop: 8,
            width: "100%",
            background: "#DDEFE1",
            border: "1px solid #A8D5B5",
            borderRadius: 12,
            padding: "12px 4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            cursor: "pointer",
            fontFamily: "Inter, sans-serif",
            fontSize: 13,
            fontWeight: 600,
            color: "#1D8A4E",
          }}
        >
          <IconCircleCheck size={18} stroke={1.8} color="#1D8A4E" />
          <span>End of lesson</span>
        </button>

        {/* Pickup */}
        <div style={{ marginTop: 14 }}>
          <div style={sectionLabel}>Pickup</div>
          {isEditingPickup ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <MapPin size={14} color="#8E8E93" />
              <input
                value={pickupValue}
                onChange={(e) => {
                  setPickupValue(e.target.value);
                  setPickupState("idle");
                  verifiedForRef.current = null;
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    verifyAndSavePickup();
                  }
                }}
                placeholder="Enter pickup address"
                style={fieldInput}
                autoFocus
              />
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={verifyAndSavePickup}
                disabled={pickupState === "checking"}
                aria-label="Verify and save pickup address"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  border: "1px solid #B7E4C7",
                  background: pickupState === "checking" ? "#F5F7FA" : "#E8F5E9",
                  color: "#1F6B2E",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: pickupState === "checking" ? "default" : "pointer",
                  flexShrink: 0,
                }}
              >
                <IconCircleCheck size={18} stroke={1.8} />
              </button>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: 10,
                padding: "9px 12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <MapPin size={14} color="#8E8E93" />
                <span
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: 13,
                    color: NAVY,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {pickupValue || "No address set"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingPickup(true)}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  color: "#8E8E93",
                  flexShrink: 0,
                }}
                aria-label="Edit pickup address"
              >
                <Pencil size={16} />
              </button>
            </div>
          )}
          {statusLine(
            verifiedForRef.current !== null && verifiedForRef.current === pickupValue.trim()
              ? pickupState
              : "idle",
            "Verified via Google Maps",
            "Couldn't verify — check for typos",
          )}
        </div>

        {/* what3words */}
        <div style={{ marginTop: 14 }}>
          <div style={sectionLabel}>what3words</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#E11F26", fontWeight: 700, fontFamily: "Inter, sans-serif", fontSize: 15 }}>
              ///
            </span>
            {[0, 1, 2].map((i) => (
              <Fragment key={i}>
                {i > 0 && <span style={{ color: NAVY, fontWeight: 700 }}>.</span>}
                <input
                  value={w3w[i]}
                  onChange={(e) => {
                    const next = [...w3w] as [string, string, string];
                    next[i] = e.target.value.replace(/[^a-zA-Z\u00C0-\u024F-]/g, "");
                    setW3w(next);
                    setW3wState("idle");
                  }}
                  onBlur={verifyAndSaveW3w}
                  placeholder={`word${i + 1}`}
                  style={{ ...fieldInput, textAlign: "center", padding: "9px 6px" }}
                />
              </Fragment>
            ))}
          </div>
          {statusLine(w3wState, "Verified via what3words", "Not a recognised what3words address")}
        </div>

        {/* Account — driven by lessons.payment_status + lessons.amount_due */}
        {(() => {
          const status = (lesson.payment_status ?? "unpaid").toLowerCase();
          const amount = balance;

          let label: string | null = null;
          let fg = NAVY;
          let bg = "#FEF7E8";
          let showActions = false;

          if (status === "paid") {
            label = "Paid ✓";
            fg = "#1F6B2E";
          } else if (status === "prepaid") {
            label = "Prepaid ✓";
            fg = "#1F6B2E";
          } else if (status === "cancelled") {
            label = "Cancelled";
            fg = "#5A6270";
            bg = "#E9EDF2";
          } else if (status === "partial") {
            label = `£${amount.toFixed(2)} remaining`;
            fg = "#8A5A00";
            showActions = true;
          } else if (status === "unpaid" && amount > 0) {
            label = `£${amount.toFixed(2)} due`;
            fg = "#8A5A00";
            showActions = true;
          }

          if (!label) return null;

          return (
            <div style={{ marginTop: 14 }}>
              <div style={sectionLabel}>Account</div>
              <div
                style={{
                  background: bg,
                  borderRadius: 9,
                  padding: "11px 12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  fontFamily: "Inter, sans-serif",
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 600, color: fg }}>{label}</span>
                {showActions && (
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      type="button"
                      onClick={() =>
                        sendSms(
                          `Hi ${firstName}, just a quick reminder that £${amount.toFixed(2)} is outstanding on your lesson account. Thanks!`,
                        )
                      }
                      style={{
                        background: "#FFFFFF",
                        color: NAVY,
                        fontSize: 11,
                        fontWeight: 500,
                        padding: "0 10px",
                        height: 26,
                        borderRadius: 8,
                        border: "none",
                        cursor: "pointer",
                        fontFamily: "Inter, sans-serif",
                      }}
                    >
                      Chase
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate({ to: "/payments" } as never)}
                      style={{
                        background: "#3B6D11",
                        color: "#FFFFFF",
                        fontSize: 11,
                        fontWeight: 500,
                        padding: "0 10px",
                        height: 26,
                        borderRadius: 8,
                        border: "none",
                        cursor: "pointer",
                        fontFamily: "Inter, sans-serif",
                      }}
                    >
                      Mark paid
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Last lesson */}
        <div style={{ marginTop: 14 }}>
          <div style={sectionLabel}>Last Lesson</div>
          {prev ? (
            <div
              style={{ background: "#F2F2F7", borderRadius: 9, padding: "10px 12px", fontFamily: "Inter, sans-serif" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: NAVY }}>
                  {new Date(prev.lesson_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </span>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 500,
                    padding: "2px 8px",
                    borderRadius: 999,
                    color: "#5A6270",
                    background: "#E9EDF2",
                    textTransform: "capitalize",
                  }}
                >
                  {prev.status}
                </span>
              </div>
              {prev.notes && (
                <div style={{ marginTop: 5, color: "#5A6270", fontSize: 11, lineHeight: 1.4 }}>{prev.notes}</div>
              )}
            </div>
          ) : (
            <div
              style={{
                background: "#F2F2F7",
                borderRadius: 9,
                padding: "10px 12px",
                color: "#8A93A3",
                fontFamily: "Inter, sans-serif",
                fontSize: 12,
              }}
            >
              No previous lesson
            </div>
          )}
        </div>

        {/* Full pupil profile link */}
        <button
          type="button"
          onClick={() =>
            navigate({ to: "/pupils/$id", params: { id: lesson.pupil_id }, search: { lessonId: lesson.id } } as never)
          }
          style={{
            marginTop: 14,
            marginBottom: 8,
            width: "100%",
            textAlign: "center",
            background: "none",
            border: "none",
            color: "#1877D6",
            fontFamily: "Inter, sans-serif",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            padding: 0,
          }}
        >
          View full pupil profile →
        </button>
        </>
        )}
      </BottomSheet>


      <SendMessageSheet
        open={messageOpen}
        onClose={() => setMessageOpen(false)}
        initialPupilId={lesson.pupil_id}
      />

      <UnifiedPaymentSheet
        open={unifiedPayOpen}
        onClose={() => setUnifiedPayOpen(false)}
        initialPupilId={lesson.pupil_id}
      />
    </>
  );
}

export default LessonActionsSheet;
