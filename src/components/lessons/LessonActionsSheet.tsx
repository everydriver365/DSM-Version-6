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
  IconRoad,
  IconPlayerPlay,
  IconFlagCheck,
  IconCar,
  IconCalendar,
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
  trafficData?: {
    travelMins: number;
    delayMins: number;
    incidents: { description: string }[];
    status: "clear" | "delay" | "incident";
  } | null;
  trafficLoading?: boolean;
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

const ACTION_CARD: React.CSSProperties = {
  background: "#fff",
  borderRadius: 12,
  border: "1px solid #E4E8EF",
  overflow: "hidden",
  marginBottom: 10,
};

const ACTION_ROW_BASE: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "14px 16px",
  width: "100%",
  textAlign: "left",
  border: "none",
  background: "none",
  cursor: "pointer",
  fontFamily: "Poppins, sans-serif",
};

const ACTION_ROW_LABEL: React.CSSProperties = {
  fontFamily: "Poppins, sans-serif",
  fontSize: 15,
  fontWeight: tokens.fontWeight.medium,
  color: NAVY,
  minWidth: 0,
};

const SECTION_LABEL_STYLE: React.CSSProperties = {
  fontFamily: "Poppins, sans-serif",
  fontSize: 11,
  fontWeight: tokens.fontWeight.bold,
  color: "#536579",
  textTransform: "uppercase",
  letterSpacing: 0.6,
  padding: "8px 4px 6px",
};

const DANGER_SECTION_LABEL_STYLE: React.CSSProperties = {
  ...SECTION_LABEL_STYLE,
  color: "#E53935",
};

const DANGER_CARD: React.CSSProperties = {
  ...ACTION_CARD,
  border: "1px solid #FEE2E2",
};

const PROMINENT_BUTTON: React.CSSProperties = {
  height: 48,
  borderRadius: 12,
  background: "#0B2341",
  color: "#fff",
  fontFamily: "Poppins, sans-serif",
  fontSize: 15,
  fontWeight: tokens.fontWeight.bold,
  border: "none",
  cursor: "pointer",
  width: "calc(100% - 32px)",
  margin: "12px 16px",
};

const EOL_BUTTON: React.CSSProperties = {
  height: 48,
  borderRadius: 12,
  background: "#16A34A",
  color: "#fff",
  fontFamily: "Poppins, sans-serif",
  fontSize: 15,
  fontWeight: tokens.fontWeight.bold,
  border: "none",
  cursor: "pointer",
  width: "calc(100% - 32px)",
  margin: "12px 16px",
};

function ChevronRight() {
  return (
    <span style={{ marginLeft: "auto", display: "flex", flexShrink: 0 }}>
      <IconChevronRight size={18} stroke={1.5} color="#C2CAD6" />
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

// ---------------------------------------------------------------------------
// Tile grid layout
// ---------------------------------------------------------------------------
const TILE_GRID: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 8,
};

const TILE: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #E4E8EF",
  borderRadius: 12,
  padding: "12px 6px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 6,
  cursor: "pointer",
  boxShadow: "0 2px 0 #E4E4E8",
};

const TILE_ICON_CONTAINER: React.CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: 10,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const TILE_LABEL: React.CSSProperties = {
  fontFamily: "Poppins, sans-serif",
  fontSize: 11,
  fontWeight: 600,
  color: "#0B2341",
  textAlign: "center",
  lineHeight: 1.2,
};

const TILE_SECTION_LABEL: React.CSSProperties = {
  fontFamily: "Poppins, sans-serif",
  fontSize: 11,
  fontWeight: tokens.fontWeight.bold,
  color: "#536579",
  textTransform: "uppercase",
  letterSpacing: 0.6,
  padding: "4px 4px 8px",
};

const PROMINENT_BUTTON_ROW: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 8,
  marginBottom: 12,
};

const PROMINENT_BUTTON_BASE: React.CSSProperties = {
  height: 48,
  borderRadius: 12,
  border: "none",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  fontFamily: "Poppins, sans-serif",
  fontSize: 14,
  fontWeight: 700,
  color: "#fff",
};

const DANGER_BUTTON_ROW: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 8,
  marginTop: 12,
  marginBottom: 12,
};

const DANGER_BUTTON: React.CSSProperties = {
  height: 44,
  borderRadius: 12,
  border: "1px solid #FEE2E2",
  background: "#fff",
  color: "#E53935",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  fontFamily: "Poppins, sans-serif",
  fontSize: 13,
  fontWeight: 600,
};

function ActionTile({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ size?: number; stroke?: number; color?: string }>;
  iconBg: string;
  iconColor: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} style={TILE}>
      <div style={{ ...TILE_ICON_CONTAINER, background: iconBg }}>
        <Icon size={20} stroke={1.8} color={iconColor} />
      </div>
      <span style={TILE_LABEL}>{label}</span>
    </button>
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
  trafficData: trafficDataProp,
  trafficLoading: trafficLoadingProp,
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

  // ===== Live traffic / road issues on the route to pickup (TomTom) =====
  type TrafficIncident = { description: string };
  const [internalTrafficData, setInternalTrafficData] = useState<{
    travelMins: number;
    delayMins: number;
    incidents: TrafficIncident[];
    status: "clear" | "delay" | "incident";
  } | null>(null);
  const [internalTrafficLoading, setInternalTrafficLoading] = useState(false);
  // Share external traffic state when provided (home page) to avoid duplicate fetches.
  const trafficData = trafficDataProp !== undefined ? trafficDataProp : internalTrafficData;
  const trafficLoading = trafficLoadingProp !== undefined ? trafficLoadingProp : internalTrafficLoading;


  useEffect(() => {
    if (trafficDataProp !== undefined) {
      // State is managed by the parent (home page); just reset internal state on close.
      if (!open) {
        setInternalTrafficData(null);
        setInternalTrafficLoading(false);
      }
      return;
    }
    if (!open) {
      setInternalTrafficData(null);
      setInternalTrafficLoading(false);
      return;
    }
    const pickup = (lesson.pickup_location ?? "").trim();
    if (!pickup) return;

    // Only for lessons today or tomorrow
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lessonDay = new Date(`${lesson.lesson_date}T00:00:00`);
    const dayDiff = Math.round((lessonDay.getTime() - today.getTime()) / 86400000);
    if (dayDiff !== 0 && dayDiff !== 1) return;
    if (!("geolocation" in navigator)) return;

    let cancelled = false;
    const KEY = "sU3STzRmGy7LHNUyIuTP6noG7vqqoISH";

    (async () => {
      setInternalTrafficLoading(true);
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 8000,
            maximumAge: 60000,
          }),
        );
        const currentLat = pos.coords.latitude;
        const currentLng = pos.coords.longitude;

        const geocodeRes = await fetch(
          `https://api.tomtom.com/search/2/geocode/${encodeURIComponent(pickup)}.json?key=${KEY}&countrySet=GB&limit=1`,
        );
        const geocodeData = await geocodeRes.json();
        const dest = geocodeData?.results?.[0]?.position;
        if (!dest || cancelled) throw new Error("no geocode");

        const routeRes = await fetch(
          `https://api.tomtom.com/routing/1/calculateRoute/${currentLat},${currentLng}:${dest.lat},${dest.lon}/json?key=${KEY}&traffic=true&travelMode=car`,
        );
        const routeData = await routeRes.json();
        const summary = routeData?.routes?.[0]?.summary;
        if (!summary || cancelled) throw new Error("no route");

        const travelMins = Math.round((summary.travelTimeInSeconds ?? 0) / 60);
        const delayMins = Math.round((summary.trafficDelayInSeconds ?? 0) / 60);

        let incidents: TrafficIncident[] = [];
        try {
          const bbox = [
            Math.min(currentLng, dest.lon),
            Math.min(currentLat, dest.lat),
            Math.max(currentLng, dest.lon),
            Math.max(currentLat, dest.lat),
          ].join(",");
          const incidentRes = await fetch(
            `https://api.tomtom.com/traffic/services/5/incidentDetails?key=${KEY}&bbox=${bbox}&fields={incidents{type,geometry,properties{iconCategory,magnitudeOfDelay,events{description,code},startTime,endTime,from,to,length,delay}}}`,
          );
          const incidentData = await incidentRes.json();
          incidents = (incidentData?.incidents ?? [])
            .map((inc: any) => ({
              description:
                inc?.properties?.events?.[0]?.description ??
                [inc?.properties?.from, inc?.properties?.to].filter(Boolean).join(" → ") ??
                "Traffic incident on route",
            }))
            .filter((i: TrafficIncident) => !!i.description);
        } catch {
          incidents = [];
        }

        const status: "clear" | "delay" | "incident" =
          incidents.length > 0 || delayMins >= 10
            ? "incident"
            : delayMins >= 3
              ? "delay"
              : "clear";

        if (!cancelled) setInternalTrafficData({ travelMins, delayMins, incidents, status });
      } catch {
        if (!cancelled) setInternalTrafficData(null); // fail silently
      } finally {
        if (!cancelled) setInternalTrafficLoading(false);
      }
    })();


    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lesson.id, lesson.pickup_location, lesson.lesson_date]);





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
    padding: "12px 16px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
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
    padding: "9px 16px",
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
            gap: 4,
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
            gap: 4,
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
        headerStyle={{ backgroundColor: "#0B2341" }}
        titleStyle={{
          color: "#FFFFFF",
          fontSize: 18,
          fontWeight: 700,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
        subtitleStyle={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}
        headerRight={
          payPill ? (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "3px 10px",
                borderRadius: 999,
                background: payPill.bg,
                color: payPill.fg,
                fontSize: 11,
                fontWeight: 600,
                fontFamily: "Poppins, sans-serif",
              }}
            >
              {payPill.label}
            </div>
          ) : null
        }
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
                padding: 16,
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
                padding: 16,
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
                            padding: "12px 16px",
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
            <div style={{ background: "#F4F6F8", margin: "0 -16px", padding: "0 16px" }}>
              {/* Prominent buttons */}
              <div style={PROMINENT_BUTTON_ROW}>
                <button
                  type="button"
                  style={{ ...PROMINENT_BUTTON_BASE, background: "#0B2341" }}
                  onClick={() => setGoingActive(!goingActive)}
                >
                  <IconPlayerPlay size={18} stroke={2} />
                  {goingActive ? "Going active" : "Start lesson"}
                </button>
                <button
                  type="button"
                  style={{ ...PROMINENT_BUTTON_BASE, background: "#16A34A" }}
                  onClick={onEol}
                >
                  <IconFlagCheck size={18} stroke={2} />
                  End of lesson
                </button>
              </div>

              {/* Quick actions */}
              <div style={TILE_SECTION_LABEL}>Quick actions</div>
              <div style={{ ...TILE_GRID, marginBottom: 12 }}>
                <ActionTile
                  icon={IconMessage}
                  iconBg="#EAF5FC"
                  iconColor="#2C97DE"
                  label="Message"
                  onClick={() => setMessageOpen(true)}
                />
                <ActionTile
                  icon={IconPhone}
                  iconBg="#DCFCE7"
                  iconColor="#16A34A"
                  label="Call"
                  onClick={() => {
                    if (!phone) {
                      toast("No phone number");
                      return;
                    }
                    window.location.href = `tel:${phone}`;
                  }}
                />
                <ActionTile
                  icon={IconNavigation}
                  iconBg="#EDE9FE"
                  iconColor="#7B61FF"
                  label="Navigate"
                  onClick={openMaps}
                />
                <ActionTile
                  icon={IconCurrencyPound}
                  iconBg="#DCFCE7"
                  iconColor="#16A34A"
                  label="Payment"
                  onClick={() => setUnifiedPayOpen(true)}
                />
              </div>

              {/* On the road */}
              <div style={TILE_SECTION_LABEL}>On the road</div>
              <div style={{ ...TILE_GRID, marginBottom: 12 }}>
                <ActionTile
                  icon={IconCar}
                  iconBg="#EAF5FC"
                  iconColor="#2C97DE"
                  label="On my way"
                  onClick={() => {
                    setGoingActive(true);
                    sendSms(`Hi ${firstName}, on the way!`);
                  }}
                />
                <ActionTile
                  icon={IconMapPin}
                  iconBg="#EAF5FC"
                  iconColor="#2C97DE"
                  label="I'm here"
                  onClick={() => sendSms(`Hi ${firstName}, I'm outside whenever you're ready 👋`)}
                />
                <ActionTile
                  icon={IconClockExclamation}
                  iconBg="#FEF3C7"
                  iconColor="#F59E0B"
                  label="Running late"
                  onClick={onOpenLate}
                />
                <ActionTile
                  icon={IconRoute}
                  iconBg="#EDE9FE"
                  iconColor="#7B61FF"
                  label="Track live"
                  onClick={() =>
                    navigate({
                      to: "/live",
                      search: { autostart: "1", lessonId: lesson.id, pupilId: lesson.pupil_id },
                    } as never)
                  }
                />
              </div>

              {/* Manage */}
              <div style={TILE_SECTION_LABEL}>Manage</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 12 }}>
                <ActionTile
                  icon={IconPencil}
                  iconBg="#FEF3C7"
                  iconColor="#F59E0B"
                  label="Edit"
                  onClick={() => navigate({ to: "/lessons/edit/$id", params: { id: lesson.id } })}
                />
                <ActionTile
                  icon={IconCalendar}
                  iconBg="#EAF5FC"
                  iconColor="#2C97DE"
                  label="Reschedule"
                  onClick={() => setInlineView("reschedule")}
                />
                <ActionTile
                  icon={IconClock}
                  iconBg="#EAF5FC"
                  iconColor="#2C97DE"
                  label="Duration"
                  onClick={() => setInlineView("duration")}
                />
                <ActionTile
                  icon={IconNotes}
                  iconBg="#EAF5FC"
                  iconColor="#2C97DE"
                  label="Note"
                  onClick={() => setInlineView("note")}
                />
                <ActionTile
                  icon={IconClipboardList}
                  iconBg="#EAF5FC"
                  iconColor="#2C97DE"
                  label="Profile"
                  onClick={() =>
                    navigate({ to: "/pupils/$id", params: { id: lesson.pupil_id }, search: { lessonId: lesson.id } } as never)
                  }
                />
                <ActionTile
                  icon={IconClipboardList}
                  iconBg="#EAF5FC"
                  iconColor="#2C97DE"
                  label="Lesson prep"
                  onClick={onOpenLesson}
                />
              </div>

              {/* Danger zone */}
              <div style={DANGER_BUTTON_ROW}>
                <button type="button" style={DANGER_BUTTON} onClick={() => setInlineView("cancel")}>
                  <IconX size={18} stroke={2} />
                  Cancel lesson
                </button>
                <button type="button" style={DANGER_BUTTON} onClick={() => setInlineView("delete")}>
                  <IconTrash size={18} stroke={2} />
                  Delete lesson
                </button>
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
            </div>
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
