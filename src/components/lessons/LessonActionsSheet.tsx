import { tokens } from "@/lib/tokens";
import React, { Fragment, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import {
  IconAlertCircle,
  IconAlertTriangle,
  IconCheck,
  IconChevronRight,
  IconClock,
  IconCurrencyPound,
  IconMap,
  IconMapPin,
  IconNotes,
  IconRepeat,
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
  IconRoute,
} from "@tabler/icons-react";

import { BottomSheet, SheetGroup, SheetRow } from "@/components/dsm/BottomSheetV2";

import { SendMessageSheet } from "@/components/messages/SendMessageSheet";
import { UnifiedPaymentSheet } from "@/components/payments/UnifiedPaymentSheet";
import { CancelSummaryPanel } from "@/components/lessons/CancelSummaryPanel";
import { cancelLessonWithUndo, UNDO_WINDOW_MS } from "@/lib/cancelLesson";
import {
  availableChargeOptions,
  clampFee,
  coerceChargeOption,
  describeChargeOption,
  feeCap,
  normalizePayState,
} from "@/lib/cancelCharge";

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

const rowLabel: React.CSSProperties = {
  fontFamily: "Poppins, sans-serif",
  fontSize: 15,
  fontWeight: tokens.fontWeight.medium,
  color: NAVY,
  minWidth: 0,
};

function Chevron() {
  return (
    <span style={{ marginLeft: "auto", display: "flex", flexShrink: 0 }}>
      <IconChevronRight size={18} stroke={1.8} color="#C2CAD6" />
    </span>
  );
}

const ACTION_ROW_LABEL: React.CSSProperties = {
  fontFamily: "Poppins, sans-serif",
  fontSize: 15,
  fontWeight: tokens.fontWeight.bold,
  color: NAVY,
  minWidth: 0,
};

const ACTION_CARD: React.CSSProperties = {
  background: "#fff",
  borderRadius: tokens.radiusCard,
  overflow: "hidden",
  boxShadow: "0 4px 0 #E4E4E8, 0 12px 26px rgba(0,0,0,0.06)",
  marginBottom: 10,
};

const ACTION_ROW_BASE: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 13,
  padding: "15px 16px",
  width: "100%",
  textAlign: "left",
  border: "none",
  background: "none",
  cursor: "pointer",
  fontFamily: "Poppins, sans-serif",
};

const SECTION_LABEL_STYLE: React.CSSProperties = {
  fontFamily: "Poppins, sans-serif",
  fontSize: 11.5,
  fontWeight: tokens.fontWeight.bold,
  color: "#8A8A8E",
  textTransform: "uppercase",
  letterSpacing: 0.5,
  margin: "4px 4px 10px",
};

function ChevronRight() {
  return (
    <span style={{ marginLeft: "auto", display: "flex", flexShrink: 0 }}>
      <IconChevronRight size={15} stroke={1.8} color="#C7C7CC" />
    </span>
  );
}

function TintedIcon({
  icon: Icon,
  bg,
  color,
}: {
  icon: React.ComponentType<{ size?: number; stroke?: number; color?: string }>;
  bg: string;
  color: string;
}) {
  return (
    <div
      style={{
        width: 34,
        height: 34,
        borderRadius: 12,
        background: bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Icon size={20} stroke={1.8} color={color} />
    </div>
  );
}


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

  // Keep the selected charge option valid for the lesson's payment state
  useEffect(() => {
    setChargeOption((prev) => coerceChargeOption(prev, lesson.payment_status));
  }, [lesson.payment_status, inlineView]);



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
    fontSize: tokens.fontSize.xs,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.textMuted,
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
    fontSize: tokens.fontSize.base,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.navy,
  };
  const chargeSub: React.CSSProperties = {
    fontFamily: "Poppins, sans-serif",
    fontSize: tokens.fontSize.sm,
    color: tokens.textSecondary,
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
    color: tokens.blue,
    background: "none",
    border: "none",
    padding: "8px 0",
    cursor: "pointer",
    fontFamily: "Poppins, sans-serif",
  };
  const inlineHeading: React.CSSProperties = {
    fontSize: tokens.fontSize.md,
    fontWeight: tokens.fontWeight.semibold,
    color: NAVY,
    fontFamily: "Poppins, sans-serif",
    margin: "4px 0 10px",
  };
  const primaryBtn: React.CSSProperties = {
    marginTop: 12,
    width: "100%",
    background: tokens.blue,
    color: tokens.white,
    border: "none",
    borderRadius: tokens.radiusCard,
    padding: "12px 0",
    fontFamily: "Poppins, sans-serif",
    fontSize: tokens.fontSize.base,
    fontWeight: tokens.fontWeight.semibold,
    cursor: "pointer",
  };
  const greyBtn: React.CSSProperties = {
    marginTop: 8,
    width: "100%",
    background: "#F5F7FA",
    color: NAVY,
    border: "1px solid #E2E8F0",
    borderRadius: tokens.radiusCard,
    padding: "12px 0",
    fontFamily: "Poppins, sans-serif",
    fontSize: tokens.fontSize.base,
    fontWeight: tokens.fontWeight.semibold,
    cursor: "pointer",
  };


  const openMaps = () => {
    const dest = (lesson.pickup_location ?? lesson.pupils?.address ?? lesson.pupils?.postcode ?? "").trim();
    if (!dest) {
      toast("No pickup address set");
      return;
    }
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`, "_blank");
  };

  const sendSms = (body: string) => {

    if (!phone) {
      toast("No phone number");
      return;
    }
    window.location.href = `sms:${phone}?&body=${encodeURIComponent(body)}`;
  };

  const pillLabel: React.CSSProperties = { fontSize: tokens.fontSize.sm, fontWeight: 500 };
  const sectionLabel: React.CSSProperties = {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.semibold,
    color: "#8E8E93",
    textTransform: "uppercase",
    letterSpacing: 0.2,
    marginBottom: 6,
    fontFamily: "Poppins, sans-serif",
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
    borderRadius: tokens.radiusCard,
    padding: "10px 4px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    cursor: "pointer",
    fontFamily: "Poppins, sans-serif",
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.medium,
    color: NAVY,
  };
  const gridBtnDanger: React.CSSProperties = {
    ...gridBtn,
    background: "#FDF3F3",
    border: "1px solid #F6D0D0",
    color: tokens.red,
  };
  const iconBg = (bg: string): React.CSSProperties => ({
    width: 30,
    height: 30,
    borderRadius: 12,
    background: bg,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  });

  const fieldInput: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    background: tokens.white,
    border: "1px solid #E2E8F0",
    borderRadius: tokens.radiusCard,
    padding: "9px 12px",
    fontFamily: "Poppins, sans-serif",
    fontSize: tokens.fontSize.base,
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
        <div style={{ marginTop: 6, fontSize: tokens.fontSize.sm, color: "#8E8E93", fontFamily: "Poppins, sans-serif" }}>
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
            fontSize: tokens.fontSize.sm,
            color: "#1F6B2E",
            fontFamily: "Poppins, sans-serif",
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
            fontSize: tokens.fontSize.sm,
            color: "#B45309",
            fontFamily: "Poppins, sans-serif",
          }}
        >
          <IconAlertTriangle size={14} stroke={1.8} /> {badText}
        </div>
      );
    }
    return (
      <div style={{ marginTop: 6, fontSize: tokens.fontSize.sm, color: "#8E8E93", fontFamily: "Poppins, sans-serif" }}>
        Not yet verified
      </div>
    );
  };

  // --- Header payment pill ---
  const payStatus = (lesson.payment_status ?? "unpaid").toLowerCase();
  const payState = normalizePayState(payStatus);
  const chargeOptions = availableChargeOptions(payStatus);
  const cancelFeeCap = feeCap(lesson.amount_due);
  const chargeCtx = { paymentStatus: payStatus, amountDue: lesson.amount_due, fee: cancelFee };
  const noneDesc = describeChargeOption("none", chargeCtx);
  const feeDesc = describeChargeOption("fee", chargeCtx);
  const activeDesc = describeChargeOption(chargeOption, chargeCtx);

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
      <BottomSheet
        title={pupilName}
        subtitle={`${dateLabel} · ${timeLabel}${durationLabel}`}
        onClose={onClose}
      >


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
                borderRadius: tokens.radiusCard,
                fontFamily: "Poppins, sans-serif",
                fontSize: tokens.fontSize.base,
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
              <div style={{ ...inlineHeading, color: tokens.red, margin: 0 }}>
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
                      borderRadius: 999,
                      padding: "4px 10px",
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
                borderRadius: tokens.radiusCard,
                fontFamily: "Poppins, sans-serif",
                fontSize: tokens.fontSize.base,
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
                <div style={chargeSub}>{noneDesc.subtitle}</div>
              </button>

              {chargeOptions.includes("fee") && (
                <div>
                  <button
                    type="button"
                    onClick={() => setChargeOption("fee")}
                    style={chargeRow(chargeOption === "fee", "#FEF3C7", "#B45309")}
                  >
                    <div style={chargeTitle}>Charge cancellation fee</div>
                    <div style={chargeSub}>{feeDesc.subtitle}</div>
                  </button>
                  {chargeOption === "fee" && (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
                        <span style={{ fontFamily: "Poppins, sans-serif", fontSize: tokens.fontSize.base, color: tokens.textSecondary }}>£</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          max={cancelFeeCap ?? undefined}
                          value={cancelFee}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (raw === "") return setCancelFee("");
                            const clamped = clampFee(raw, lesson.amount_due);
                            setCancelFee(
                              cancelFeeCap != null && Number(raw) > cancelFeeCap ? String(clamped) : raw,
                            );
                          }}
                          placeholder="e.g. 20.00"
                          style={{
                            flex: 1,
                            border: "1px solid #E4E8EF",
                            borderRadius: tokens.radiusCard,
                            padding: "10px 12px",
                            fontFamily: "Poppins, sans-serif",
                            fontSize: tokens.fontSize.base,
                            boxSizing: "border-box",
                          }}
                        />
                      </div>
                      {(feeDesc.error || cancelFeeCap != null) && (
                        <div
                          style={{
                            fontFamily: "Poppins, sans-serif",
                            fontSize: tokens.fontSize.sm,
                            marginTop: 6,
                            color: feeDesc.error ? "#CC2229" : "#6B7686",
                          }}
                        >
                          {feeDesc.error ?? `Maximum £${cancelFeeCap!.toFixed(2)} (lesson value)`}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {chargeOptions.includes("full") && (
                <button
                  type="button"
                  onClick={() => setChargeOption("full")}
                  style={chargeRow(chargeOption === "full", "#FCE9E9", "#CC2229")}
                >
                  <div style={chargeTitle}>Charge full lesson</div>
                  <div style={chargeSub}>No refund — full payment retained</div>
                </button>
              )}

            {/* SECTION 4 — Summary */}
            {cancelReason && (
              <CancelSummaryPanel
                reason={cancelReason}
                notes={cancelNote}
                chargeOption={chargeOption}
                cancelFee={cancelFee}
                amountDue={lesson.amount_due}
                paymentStatus={payStatus}
              />
            )}
            </div>


            <button
              type="button"
              disabled={saving || !cancelReason || !activeDesc.valid}
              style={{
                ...primaryBtn,
                background: tokens.red,
                opacity: !cancelReason || !activeDesc.valid || saving ? 0.5 : 1,
              }}
              onClick={async () => {
                setSaving(true);

                const feeAmt = clampFee(cancelFee, lesson.amount_due);
                const outcome = activeDesc.outcomeText;

                const patch: Record<string, unknown> = {
                  status: "cancelled",
                  payment_status: "cancelled",
                  cancellation_reason: cancelReason,
                  cancellation_notes: cancelNote || null,
                  cancelled_at: new Date().toISOString(),
                };
                if (chargeOption === "fee" && payState === "unpaid") {
                  patch.amount_due = feeAmt;
                } else if (chargeOption === "none" && payState === "unpaid") {
                  patch.amount_due = 0;
                }

                const handle = await cancelLessonWithUndo({
                  lessonId: lesson.id,
                  patch,
                  financials: async () => {
                    const { recordRefund } = await import("@/lib/payments");

                    if (chargeOption === "none" && (payState === "paid" || payState === "partial")) {
                      await recordRefund({
                        pupilId: lesson.pupil_id,
                        amount: Number(lesson.amount_due ?? 0),
                        method: "cash",
                        notes: `Cancellation refund — ${cancelReason}`,
                        currentAccountBalance: 0,
                      });
                    } else if (chargeOption === "none" && payState === "prepaid") {
                      const { data: pRow } = await supabase
                        .from("pupils")
                        .select("prepaid_hours")
                        .eq("id", lesson.pupil_id)
                        .maybeSingle();
                      const currentHours = Number(
                        (pRow as { prepaid_hours?: number | null } | null)?.prepaid_hours ?? 0,
                      );
                      await supabase
                        .from("pupils")
                        .update({ prepaid_hours: currentHours + 1 } as never)
                        .eq("id", lesson.pupil_id);
                    } else if (chargeOption === "fee" && (payState === "paid" || payState === "partial")) {
                      const refund = Number(lesson.amount_due ?? 0) - feeAmt;
                      if (refund > 0) {
                        await recordRefund({
                          pupilId: lesson.pupil_id,
                          amount: refund,
                          method: "cash",
                          notes: `Partial refund — cancellation fee £${feeAmt.toFixed(2)} retained`,
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


                    // Audit row capturing the cancellation reason, notes and outcome
                    await supabase.from("lesson_history").insert({
                      instructor_id: (lesson as any).instructor_id,
                      pupil_id: lesson.pupil_id,
                      amount_paid: chargeOption === "full"
                        ? Number(lesson.amount_due ?? 0)
                        : chargeOption === "fee" ? feeAmt : 0,
                      payment_method: "cancellation",
                      payment_status: "cancelled",
                      notes: `Cancelled — ${cancelReason}${cancelNote ? ` — ${cancelNote}` : ""} · ${outcome}`,
                      created_at: new Date().toISOString(),
                    } as never);
                  },
                });

                if (!handle) {
                  toast.error("Couldn't cancel lesson");
                  setSaving(false);
                  return;
                }

                toast.success("Lesson cancelled", {
                  duration: UNDO_WINDOW_MS,
                  action: {
                    label: "Undo",
                    onClick: () => {
                      void handle
                        .undo()
                        .then(() => toast.success("Cancellation undone"))
                        .catch(() => toast.error("Couldn't undo cancellation"));
                    },
                  },
                });
                setTimeout(() => {
                  window.dispatchEvent(new Event('dsm-payment-recorded'));
                }, 300);
                setSaving(false);
                onClose();
                navigate({ to: "/home" });
              }}

            >
              {saving ? "Cancelling…" : activeDesc.confirmLabel}
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
            <div style={{ ...inlineHeading, color: tokens.red, textAlign: "center" }}>
              Delete this lesson?
            </div>
            <div style={{ fontFamily: "Poppins, sans-serif", fontSize: tokens.fontSize.sm, color: tokens.textMuted }}>
              This cannot be undone
            </div>
            <button
              type="button"
              disabled={saving}
              style={{ ...primaryBtn, background: tokens.red }}
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
            {/* CHANGE 2 — Lesson info card (time / location / payment) */}
            <div style={ACTION_CARD}>
              <div style={{ ...ACTION_ROW_BASE, borderTop: "none", cursor: "default" }}>
                <TintedIcon icon={IconClock} bg="#E7F1FC" color="#1877D6" />
                <span style={ACTION_ROW_LABEL}>
                  {timeLabel}
                  {lesson.duration_minutes ? ` · ${lesson.duration_minutes} min` : ""}
                </span>
              </div>
              <div style={{ ...ACTION_ROW_BASE, borderTop: "1px solid #EFEFF2", cursor: "default" }}>
                <TintedIcon icon={IconMapPin} bg="#F3EEFB" color="#7B4FC9" />
                <span style={{ ...ACTION_ROW_LABEL, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                  {pickupValue || "No address set"}
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditingPickup((v) => !v)}
                  aria-label="Edit pickup address"
                  style={{ marginLeft: "auto", background: "none", border: "none", padding: 0, cursor: "pointer", color: "#B0B0B5", display: "flex" }}
                >
                  <IconPencil stroke={1.5} size={15} />
                </button>
              </div>
              {isEditingPickup ? (
                <div style={{ ...ACTION_ROW_BASE, borderTop: "1px solid #EFEFF2" }}>
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
                      borderRadius: 12,
                      border: "1px solid #B7E4C7",
                      background: pickupState === "checking" ? "#F5F7FA" : "#E8F5E9",
                      color: "#1F6B2E",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <IconCircleCheck size={18} stroke={1.8} />
                  </button>
                </div>
              ) : null}
              <div style={{ ...ACTION_ROW_BASE, borderTop: "1px solid #EFEFF2", cursor: "default" }}>
                <TintedIcon icon={IconCurrencyPound} bg="#E6F7EC" color="#248A3D" />
                <span style={ACTION_ROW_LABEL}>
                  {balance > 0 ? `£${balance.toFixed(2)} due` : "Nothing outstanding"}
                </span>
                {payPill && (
                  <span
                    style={{
                      marginLeft: "auto",
                      fontFamily: "Poppins, sans-serif",
                      fontSize: 11.5,
                      fontWeight: tokens.fontWeight.extrabold,
                      color: payPill.fg,
                      background: "#E6F7EC",
                      borderRadius: tokens.radiusCard,
                      padding: "5px 12px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {payPill.label}
                  </span>
                )}
              </div>
            </div>

            {/* CHANGE 3 — Quick Actions */}
            <div style={SECTION_LABEL_STYLE}>Quick Actions</div>
            <div style={ACTION_CARD}>
              <button
                type="button"
                onClick={() => {
                  setMessageOpen(true);
                }}
                style={{ ...ACTION_ROW_BASE, borderTop: "none" }}
              >
                <TintedIcon icon={IconMessage} bg="#E7F1FC" color="#1877D6" />
                <span style={ACTION_ROW_LABEL}>Message pupil</span>
                <ChevronRight />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!phone) {
                    toast("No phone number");
                    return;
                  }
                  window.location.href = `tel:${phone}`;
                }}
                style={{ ...ACTION_ROW_BASE, borderTop: "1px solid #EFEFF2" }}
              >
                <TintedIcon icon={IconPhone} bg="#E6F7EC" color="#248A3D" />
                <span style={ACTION_ROW_LABEL}>Call pupil</span>
                <ChevronRight />
              </button>
              <button
                type="button"
                onClick={openMaps}
                style={{ ...ACTION_ROW_BASE, borderTop: "1px solid #EFEFF2" }}
              >
                <TintedIcon icon={IconMap} bg="#F3EEFB" color="#7B4FC9" />
                <span style={ACTION_ROW_LABEL}>View route</span>
                <ChevronRight />
              </button>
              <button
                type="button"
                onClick={() => setUnifiedPayOpen(true)}
                style={{ ...ACTION_ROW_BASE, borderTop: "1px solid #EFEFF2" }}
              >
                <TintedIcon icon={IconCurrencyPound} bg="#E0F7F5" color="#0E9488" />
                <span style={ACTION_ROW_LABEL}>Take payment</span>
                <ChevronRight />
              </button>
              <button
                type="button"
                onClick={onEol}
                style={{ ...ACTION_ROW_BASE, borderTop: "1px solid #EFEFF2" }}
              >
                <TintedIcon icon={IconCheck} bg="#E6F7EC" color="#248A3D" />
                <span style={ACTION_ROW_LABEL}>Mark complete</span>
                <ChevronRight />
              </button>
            </div>

            {/* On the road — kept with existing functionality */}
            <div style={SECTION_LABEL_STYLE}>On the road</div>
            <div style={ACTION_CARD}>
              <button
                type="button"
                onClick={() => {
                  setGoingActive(true);
                  sendSms(`Hi ${firstName}, on the way!`);
                }}
                style={{ ...ACTION_ROW_BASE, borderTop: "none" }}
              >
                <TintedIcon icon={IconNavigation} bg="#E7F1FC" color="#1877D6" />
                <span style={ACTION_ROW_LABEL}>Tell pupil I'm on the way</span>
                <ChevronRight />
              </button>
              <button
                type="button"
                onClick={() =>
                  navigate({
                    to: "/live",
                    search: { autostart: "1", lessonId: lesson.id, pupilId: lesson.pupil_id },
                  } as never)
                }
                style={{ ...ACTION_ROW_BASE, borderTop: "1px solid #EFEFF2" }}
              >
                <TintedIcon icon={IconRoute} bg="#F3EEFB" color="#7B4FC9" />
                <span style={ACTION_ROW_LABEL}>Track lesson live</span>
                <ChevronRight />
              </button>
              <button
                type="button"
                onClick={onOpenLate}
                style={{ ...ACTION_ROW_BASE, borderTop: "1px solid #EFEFF2" }}
              >
                <TintedIcon icon={IconClockExclamation} bg="#FFF6DC" color="#D68A1B" />
                <span style={ACTION_ROW_LABEL}>Running late</span>
                <ChevronRight />
              </button>
              <button
                type="button"
                onClick={() => sendSms(`Hi ${firstName}, I'm outside whenever you're ready 👋`)}
                style={{ ...ACTION_ROW_BASE, borderTop: "1px solid #EFEFF2" }}
              >
                <TintedIcon icon={IconCurrentLocation} bg="#E7F1FC" color="#1877D6" />
                <span style={ACTION_ROW_LABEL}>I'm here</span>
                <ChevronRight />
              </button>
              <button
                type="button"
                onClick={onOpenLesson}
                style={{ ...ACTION_ROW_BASE, borderTop: "1px solid #EFEFF2" }}
              >
                <TintedIcon icon={IconClipboardList} bg="#F2F2F7" color="#6B6B6F" />
                <span style={ACTION_ROW_LABEL}>Lesson prep</span>
                <ChevronRight />
              </button>
              <button
                type="button"
                onClick={() =>
                  navigate({ to: "/pupils/$id", params: { id: lesson.pupil_id }, search: { lessonId: lesson.id } } as never)
                }
                style={{ ...ACTION_ROW_BASE, borderTop: "1px solid #EFEFF2" }}
              >
                <TintedIcon icon={IconClipboardList} bg="#F2F2F7" color="#6B6B6F" />
                <span style={ACTION_ROW_LABEL}>View full pupil profile</span>
                <ChevronRight />
              </button>
            </div>

            {/* CHANGE 4 — Manage */}
            <div style={{ ...SECTION_LABEL_STYLE, marginTop: 20 }}>Manage</div>
            <div style={ACTION_CARD}>
              <button
                type="button"
                onClick={() => navigate({ to: "/lessons/edit/$id", params: { id: lesson.id } })}
                style={{ ...ACTION_ROW_BASE, borderTop: "none" }}
              >
                <TintedIcon icon={IconPencil} bg="#FFF6DC" color="#D68A1B" />
                <span style={ACTION_ROW_LABEL}>Edit lesson</span>
                <ChevronRight />
              </button>
              <button
                type="button"
                onClick={() => setInlineView("reschedule")}
                style={{ ...ACTION_ROW_BASE, borderTop: "1px solid #EFEFF2" }}
              >
                <TintedIcon icon={IconRepeat} bg="#E7F1FC" color="#1877D6" />
                <span style={ACTION_ROW_LABEL}>Reschedule</span>
                <ChevronRight />
              </button>
              <button
                type="button"
                onClick={() => setInlineView("duration")}
                style={{ ...ACTION_ROW_BASE, borderTop: "1px solid #EFEFF2" }}
              >
                <TintedIcon icon={IconClock} bg="#F3EEFB" color="#7B4FC9" />
                <span style={ACTION_ROW_LABEL}>Change duration</span>
                <ChevronRight />
              </button>
              <button
                type="button"
                onClick={() => setInlineView("note")}
                style={{ ...ACTION_ROW_BASE, borderTop: "1px solid #EFEFF2" }}
              >
                <TintedIcon icon={IconNotes} bg="#F2F2F7" color="#6B6B6F" />
                <span style={ACTION_ROW_LABEL}>Add note</span>
                <ChevronRight />
              </button>
              <button
                type="button"
                onClick={() => setInlineView("cancel")}
                style={{ ...ACTION_ROW_BASE, borderTop: "1px solid #EFEFF2" }}
              >
                <TintedIcon icon={IconX} bg="#FDEDEC" color="#FF3B30" />
                <span style={{ ...ACTION_ROW_LABEL, color: "#FF3B30" }}>Cancel lesson</span>
                <ChevronRight />
              </button>
            </div>

            {/* Delete lesson — kept for existing functionality, styled as destructive */}
            <div style={{ marginTop: 10 }}>
              <div style={ACTION_CARD}>
                <button
                  type="button"
                  onClick={() => setInlineView("delete")}
                  style={{ ...ACTION_ROW_BASE, borderTop: "none" }}
                >
                  <TintedIcon icon={IconTrash} bg="#FDEDEC" color="#FF3B30" />
                  <span style={{ ...ACTION_ROW_LABEL, color: "#FF3B30" }}>Delete lesson</span>
                  <ChevronRight />
                </button>
              </div>
            </div>

            {/* what3words */}
            <SheetGroup>
              <SheetRow>
                <span style={{ color: "#E11F26", fontWeight: tokens.fontWeight.bold, fontFamily: "Poppins, sans-serif", fontSize: 15 }}>
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
              </SheetRow>
              {w3wState !== "idle" ? (
                <SheetRow>{statusLine(w3wState, "Verified via what3words", "Not a recognised what3words address")}</SheetRow>
              ) : null}
            </SheetGroup>

            {/* Last lesson */}
            <SheetGroup>
              <SheetRow>
                <IconNotes size={20} stroke={1.8} color="#6B7686" />
                {prev ? (
                  <div style={{ minWidth: 0 }}>
                    <div style={rowLabel}>
                      {new Date(prev.lesson_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} ·{" "}
                      <span style={{ textTransform: "capitalize", color: tokens.textSecondary }}>{prev.status}</span>
                    </div>
                    {prev.notes && (
                      <div style={{ marginTop: 3, color: tokens.textSecondary, fontSize: 12, fontFamily: "Poppins, sans-serif", lineHeight: 1.4 }}>
                        {prev.notes}
                      </div>
                    )}
                  </div>
                ) : (
                  <span style={{ ...rowLabel, color: "#8A93A3" }}>No previous lesson</span>
                )}
              </SheetRow>
            </SheetGroup>
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
        onSaved={() => {
          setTimeout(() => {
            window.dispatchEvent(new Event('dsm-payment-recorded'));
          }, 300);
        }}
      />
    </>
  );
}

export default LessonActionsSheet;
