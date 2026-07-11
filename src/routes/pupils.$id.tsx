import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, Fragment, type ReactNode } from "react";
import { ArrowLeft, Award, BarChart3, BookOpen, Camera, Car, ChevronDown, ChevronRight, ClipboardCheck, ClipboardList, Clock, CreditCard, ExternalLink, Flag, Heart, History, Loader2, Mail, MapPin, MessageSquare, Palette, Pencil, Phone, Plus, PoundSterling, Search, Trash2, Trophy, X, Check } from "lucide-react";
import { jsPDF } from "jspdf";
import { toast } from "sonner";
import { Card } from "../components/dsm/Card";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { Button } from "../components/dsm/Button";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { supabase } from "../lib/supabaseClient";
import { resolveHourlyRate } from "../lib/pricing/resolveRate";
import { deletePaymentRecord } from "./payments";

export const Route = createFileRoute("/pupils/$id")({
  head: () => ({
    meta: [{ title: "Pupil — DSM by EveryDriver" }],
  }),
  component: PupilDetailPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;

const GOOGLE_MAPS_KEY =
  (import.meta as any).env?.VITE_GOOGLE_API_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY ||
  "AIzaSyDWFw0oL9ZyhwdvdvYtDsdJrTFYzF0khFc";

function loadGoogleMapsPlaces(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const w = window as any;
  if (w.google?.maps?.places) return Promise.resolve();
  const existing = document.getElementById("google-maps-places-script") as HTMLScriptElement | null;
  if (existing) {
    return new Promise((resolve) => {
      existing.addEventListener("load", () => resolve());
      if (w.google?.maps?.places) resolve();
    });
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.id = "google-maps-places-script";
    s.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places&loading=async`;
    s.async = true;
    s.defer = true;
    s.onload = () => {
      console.log("[pupil] Google Maps script loaded, places available:", !!w.google?.maps?.places);
      resolve();
    };
    s.onerror = (e) => {
      console.error("[pupil] Google Maps script failed to load", e);
      reject(new Error("Failed to load Google Maps"));
    };
    document.head.appendChild(s);
  });
}

function fmtUKDate(iso: string | null | undefined) {
  if (!iso) return "";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const THEORY_STATUSES = ["Not started", "Studying", "Booked", "Passed", "Failed"] as const;
const PRACTICAL_STATUSES = ["Not booked", "Booked", "Passed", "Failed"] as const;

function statusColour(s: string | null | undefined): { bg: string; fg: string } {
  switch (s) {
    case "Studying": return { bg: "#F59E0B", fg: "#FFFFFF" };
    case "Booked": return { bg: "#1877D6", fg: "#FFFFFF" };
    case "Passed": return { bg: "#16A34A", fg: "#FFFFFF" };
    case "Failed": return { bg: "#DC2626", fg: "#FFFFFF" };
    default: return { bg: "#E5E7EB", fg: "#374151" };
  }
}

interface Pupil {
  id: string;
  name: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  balance_owed: number | null;
  account_balance: number | null;
  prepaid_hours: number | null;
  prepaid_amount_paid: number | null;
  address: string | null;
  postcode: string | null;
  profile_image_url: string | null;
  status: string | null;
  test_date: string | null;
  notes: string | null;
  photo_url: string | null;
  photo_consent: boolean | null;
  lead_source: string | null;
  lead_source_detail: string | null;
  ni_amount_total: number | null;
  ni_payer: string | null;
  ni_amount_paid: number | null;
  ni_payment_date: string | null;
  ni_reference: string | null;
  test_time: string | null;
  test_centre: string | null;
  test_centre_id: string | null;
  wants_swap: boolean | null;
  theory_pass: boolean | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relation: string | null;
  driving_licence_number: string | null;
  driving_licence_checked: boolean | null;
  custom_rate: number | null;
  custom_rate_90: number | null;
  custom_rate_120: number | null;
  buffer_after_minutes: number | null;
  calendar_colour: string | null;
  theory_status: string | null;
  theory_test_date: string | null;
  theory_pass_date: string | null;
  theory_score: number | null;
  test_status: string | null;
  test_examiner: string | null;
  lat: number | null;
  lng: number | null;
}

interface Lesson {
  id: string;
  lesson_date: string;
  lesson_time: string;
  duration_minutes: number | null;
  status: string;
  amount_due: number | null;
  payment_status: string | null;
  notes: string | null;
  eol_completed: boolean | null;
  cancellation_reason: string | null;
  deleted_at: string | null;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "";
  const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (a + b).toUpperCase() || "?";
}
function formatTime(t: string) {
  return (t ?? "").slice(0, 5);
}
function formatDateShort(d: Date) {
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}
function formatTestDate(iso: string | null) {
  if (!iso) return "No test";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}
function ymd(d: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
function statusBadge(status: string | null) {
  const s = (status ?? "active").toLowerCase();
  if (s === "active") return { bg: "#1877D6", label: "Active" };
  if (s === "passed") return { bg: "#1877D6", label: "Passed" };
  return { bg: "#6B7280", label: s.charAt(0).toUpperCase() + s.slice(1) };
}
function lessonStatusColor(s: string) {
  if (s === "confirmed") return "#1877D6";
  if (s === "pending") return "#1877D6";
  if (s === "cancelled") return "#1877D6";
  return "#6B7280";
}
function isLessonLive(l: Lesson) {
  const now = new Date();
  const start = new Date(`${l.lesson_date}T${l.lesson_time}`);
  const end = new Date(start.getTime() + (l.duration_minutes ?? 60) * 60000);
  return now >= start && now <= end;
}
function isLessonPast(l: Lesson) {
  const now = new Date();
  const end = new Date(`${l.lesson_date}T${l.lesson_time}`);
  end.setMinutes(end.getMinutes() + (l.duration_minutes ?? 60));
  return now > end;
}
function accentColor(l: Lesson) {
  if (isLessonLive(l)) return "#1877D6";
  if (l.status === "completed") return "#1877D6";
  if (l.status === "cancelled") return "#9CA3AF";
  return "#1877D6";
}
function daysBetween(a: string, b: string) {
  const d1 = new Date(`${a}T00:00:00`);
  const d2 = new Date(`${b}T00:00:00`);
  const ms = d2.getTime() - d1.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function ActionTile({
  label,
  icon,
  iconBg,
  iconColor,
  onClick,
  href,
  badge,
  description,
  orientation = "vertical",
}: {
  label: string;
  icon: ReactNode;
  iconBg: string;
  iconColor: string;
  onClick?: () => void;
  href?: string;
  badge?: string;
  description?: string;
  orientation?: "vertical" | "horizontal";
}) {
  const horizontal = orientation === "horizontal";
  const iconCircle = (
    <div
      className="flex items-center justify-center rounded-full shrink-0"
      style={{ width: 40, height: 40, backgroundColor: iconBg, color: iconColor }}
    >
      {icon}
    </div>
  );
  const inner = horizontal ? (
    <div className="flex items-center gap-3 w-full min-w-0">
      {iconCircle}
      <div className="flex-1 min-w-0 text-left">
        <div className="text-[13px] font-semibold text-[#0B1F3A] truncate" style={POPPINS}>
          {label}
        </div>
        {description ? (
          <div className="text-[11px] text-[#6B7280] truncate" style={POPPINS} title={description}>
            {description}
          </div>
        ) : null}
      </div>
      {badge ? (
        <span className="text-[10px] font-semibold" style={{ color: "#1877D6" }}>
          {badge}
        </span>
      ) : null}
    </div>
  ) : (
    <div className="flex flex-col items-center gap-2 w-full relative">
      {iconCircle}
      <span className="text-[11px] font-medium text-[#0B1F3A]" style={POPPINS}>
        {label}
      </span>
      {badge ? (
        <span className="absolute top-1.5 right-2 text-[10px] font-semibold" style={{ color: "#1877D6" }}>
          {badge}
        </span>
      ) : null}
    </div>
  );
  const cls =
    "bg-white p-3 rounded-xl border border-[#E2E6ED] active:scale-[0.98] transition-transform";
  if (href) {
    return (
      <a href={href} className={cls}>
        {inner}
      </a>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cls}>
        {inner}
      </button>
    );
  }
  return <div className={cls}>{inner}</div>;
}

function PupilDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [pupil, setPupil] = useState<Pupil | null>(null);
  const [lessons, setLessons] = useState<Lesson[] | null>(null);
  const [pastLessons, setPastLessons] = useState<Lesson[] | null>(null);
  const [pastExpanded, setPastExpanded] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [progressData, setProgressData] = useState<{ total: number; competent: number } | null>(null);
  const [syllabusPct, setSyllabusPct] = useState<number | null>(null);
  const [syllabusSum, setSyllabusSum] = useState<number>(0);
  const [syllabus, setSyllabus] = useState<{ status: string }[] | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [liveOwed, setLiveOwed] = useState<number | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [paymentHistory, setPaymentHistory] = useState<
    { id: string; lesson_id: string | null; lesson_cost: number | null; payment_method: string | null; created_at: string; notes: string | null }[]
  >([]);
  const [paymentHistoryRefresh, setPaymentHistoryRefresh] = useState(0);
  const [hoursCompleted, setHoursCompleted] = useState<number>(0);
  const [instructorRate, setInstructorRate] = useState<number | null>(null);
  const [instructorBufferAfter, setInstructorBufferAfter] = useState<number | null>(null);
  const [instructorName, setInstructorName] = useState<string>("");
  const [postcodeRates, setPostcodeRates] = useState<{ outward_code: string; hourly_rate: number }[]>([]);
  const [unpaidLessons, setUnpaidLessons] = useState<{ duration_minutes: number | null; amount_due: number | null }[] | null>(null);
  const [certOpen, setCertOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState<number>(0);
  const [certMilestone, setCertMilestone] = useState<"first_lesson" | "10_lessons" | "20_lessons" | "theory_pass" | "test_pass">("test_pass");
  const [intakeAnswers, setIntakeAnswers] = useState<any[] | null>(null);
  const [addressEditing, setAddressEditing] = useState(false);
  const [theoryEditing, setTheoryEditing] = useState(false);
  const [practicalEditing, setPracticalEditing] = useState(false);
  const [emailEditing, setEmailEditing] = useState(false);
  const [emailDraft, setEmailDraft] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editDraft, setEditDraft] = useState<{
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
    status: string;
    prepaid_hours: string;
    prepaid_amount_paid: string;
    custom_rate: string;
    custom_rate_90: string;
    custom_rate_120: string;
  }>({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    status: "active",
    prepaid_hours: "",
    prepaid_amount_paid: "",
    custom_rate: "",
    custom_rate_90: "",
    custom_rate_120: "",
  });


  const openEditSheet = () => {
    if (!pupil) return;
    setEditDraft({
      first_name: pupil.first_name ?? "",
      last_name: pupil.last_name ?? "",
      phone: pupil.phone ?? "",
      email: pupil.email ?? "",
      status: (pupil.status ?? "active") || "active",
      prepaid_hours: pupil.prepaid_hours != null ? String(pupil.prepaid_hours) : "",
      prepaid_amount_paid: pupil.prepaid_amount_paid != null ? String(pupil.prepaid_amount_paid) : "",
      custom_rate: pupil.custom_rate != null ? String(pupil.custom_rate) : "",
      custom_rate_90: pupil.custom_rate_90 != null ? String(pupil.custom_rate_90) : "",
      custom_rate_120: pupil.custom_rate_120 != null ? String(pupil.custom_rate_120) : "",
    });
    setEditSheetOpen(true);
  };


  const saveEditSheet = async () => {
    if (!pupil) return;
    setEditSaving(true);
    const numOrNull = (v: string) => {
      const t = v.trim();
      if (t === "") return null;
      const n = Number(t);
      return Number.isFinite(n) ? n : null;
    };
    const first = editDraft.first_name.trim();
    const last = editDraft.last_name.trim();
    const patch = {
      first_name: first || null,
      last_name: last || null,
      name: [first, last].filter(Boolean).join(" ") || pupil.name,
      phone: editDraft.phone.trim() || null,
      email: editDraft.email.trim() || null,
      status: editDraft.status || "active",
      prepaid_hours: numOrNull(editDraft.prepaid_hours) ?? 0,
      prepaid_amount_paid: numOrNull(editDraft.prepaid_amount_paid) ?? 0,
      custom_rate: numOrNull(editDraft.custom_rate),
      custom_rate_90: numOrNull(editDraft.custom_rate_90),
      custom_rate_120: numOrNull(editDraft.custom_rate_120),
    };

    const { error } = await supabase.from("pupils").update(patch).eq("id", pupil.id);
    setEditSaving(false);
    if (error) {
      toast.error("Failed to save — please try again");
      return;
    }
    setPupil({ ...pupil, ...patch });
    setEditSheetOpen(false);
    toast.success("Pupil updated");
  };


  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const channelName = `payment-updates-pupil-${userId}`;
    console.log('[realtime] pupil profile subscribing:', channelName);
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'lessons',
        filter: `instructor_id=eq.${userId}`,
      }, () => {
        if (cancelled) return;
        console.log('[realtime] lessons changed, refetching pupil profile...');
        setPaymentHistoryRefresh((v) => v + 1);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'lesson_history',
        filter: `instructor_id=eq.${userId}`,
      }, () => {
        if (cancelled) return;
        console.log('[realtime] lesson_history changed, refetching pupil profile...');
        setPaymentHistoryRefresh((v) => v + 1);
      })
      .subscribe((status, err) => {
        console.log('[realtime] pupil profile channel status:', status, err ?? '');
      });
    return () => {
      cancelled = true;
      console.log('[realtime] pupil profile unsubscribing:', channelName);
      try {
        supabase.removeChannel(channel);
      } catch (e) {
        console.warn('[realtime] pupil profile removeChannel failed:', e);
      }
    };
  }, [userId]);

  const [practicalCentrePickerOpen, setPracticalCentrePickerOpen] = useState(false);
  const [practicalCentreSearch, setPracticalCentreSearch] = useState("");
  const addressInputRef = useRef<HTMLInputElement>(null);
  const pastCollapsedInit = useRef(false);

  // Auto-collapse past lessons if more than 5 entries
  useEffect(() => {
    if (pastCollapsedInit.current || !pastLessons) return;
    if (pastLessons.length > 5) {
      setPastExpanded(false);
    }
    pastCollapsedInit.current = true;
  }, [pastLessons]);

  // Preload Google Maps Places on mount so autocomplete is ready when user taps Edit.
  useEffect(() => {
    loadGoogleMapsPlaces().catch((e) => console.error("[pupil] preload Google Maps failed", e));
  }, []);

  // Bind Google Places Autocomplete to the address input when editing
  useEffect(() => {
    if (!addressEditing) return;
    let cancelled = false;
    loadGoogleMapsPlaces()
      .then(() => {
        if (cancelled) return;
        const input = addressInputRef.current;
        const g = (window as any).google;
        if (!input) {
          console.warn("[pupil] address input ref not attached");
          return;
        }
        if (!g?.maps?.places) {
          console.warn("[pupil] Google Places library not available — check API key / referrer / billing");
          toast.error("Address autocomplete unavailable — you can still type manually");
          return;
        }
        console.log("[pupil] binding autocomplete to address input");
        const ac = new g.maps.places.Autocomplete(input, {
          componentRestrictions: { country: "gb" },
          types: ["address"],
          fields: ["formatted_address", "address_components", "geometry"],
        });
        ac.addListener("place_changed", async () => {
          const place = ac.getPlace();
          console.log("[pupil] place_changed", place);
          const formatted: string = place.formatted_address ?? "";
          const comps: any[] = place.address_components ?? [];
          const pc = comps.find((c: any) => c.types.includes("postal_code"))?.long_name ?? "";
          const town =
            comps.find((c: any) => c.types.includes("postal_town"))?.long_name ??
            comps.find((c: any) => c.types.includes("locality"))?.long_name ??
            "";
          const lat = place.geometry?.location?.lat?.();
          const lng = place.geometry?.location?.lng?.();
          const basePatch: Record<string, unknown> = {};
          if (formatted) basePatch.address = formatted;
          if (pc) basePatch.postcode = pc;
          // Include town only if we have a value; column may not exist — handled with fallback
          const patchWithTown = town ? { ...basePatch, town } : basePatch;
          const patchWithGeo =
            typeof lat === "number" && typeof lng === "number"
              ? { ...patchWithTown, lat, lng }
              : patchWithTown;
          let { error } = await supabase.from("pupils").update(patchWithGeo).eq("id", id);
          if (error) {
            // Retry without possibly-missing columns (town, lat, lng)
            const retry = await supabase.from("pupils").update(basePatch).eq("id", id);
            error = retry.error as any;
          }
          if (error) {
            console.error("[pupil] address save error", error);
            toast.error("Failed to save address");
            return;
          }
          setPupil((p) =>
            p
              ? {
                  ...p,
                  address: formatted || p.address,
                  postcode: pc || p.postcode,
                  lat: typeof lat === "number" ? lat : p.lat,
                  lng: typeof lng === "number" ? lng : p.lng,
                }
              : p,
          );
          setAddressEditing(false);
          toast.success("Address updated");
        });
      })
      .catch(() => {
        // silent — user can still type manually and press Save
      });
    return () => {
      cancelled = true;
    };
  }, [addressEditing, id]);

  async function saveAddressManual(nextAddress: string, nextPostcode: string) {
    const patch: Record<string, unknown> = {
      address: nextAddress.trim() || null,
      postcode: nextPostcode.trim() || null,
    };
    const { error } = await supabase.from("pupils").update(patch).eq("id", id);
    if (error) {
      toast.error("Failed to save address");
      return;
    }
    setPupil((p) => (p ? { ...p, ...(patch as any) } : p));
    setAddressEditing(false);
    toast.success("Address updated");
  }

  async function savePupilFields(patch: Record<string, unknown>, successMsg: string) {
    const { error } = await supabase.from("pupils").update(patch).eq("id", id);
    if (error) {
      console.error("[pupil] save error", error);
      toast.error("Failed to save — please try again");
      return false;
    }
    setPupil((p) => (p ? { ...p, ...(patch as any) } : p));
    toast.success(successMsg);
    return true;
  }

  async function saveEmail() {
    const value = emailDraft.trim();
    if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      toast.error("Please enter a valid email address");
      return;
    }
    setSavingEmail(true);
    const ok = await savePupilFields({ email: value || null }, "Email saved");
    setSavingEmail(false);
    if (ok) setEmailEditing(false);
  }

  const [centreInfo, setCentreInfo] = useState<{ id: string; name: string; town: string | null } | null>(null);
  const [allCentres, setAllCentres] = useState<{ id: string; name: string; town: string | null }[]>([]);
  const [centrePickerOpen, setCentrePickerOpen] = useState(false);
  const [centreSearch, setCentreSearch] = useState("");
  const photoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase
      .from("pupils")
      .select(`
        id, name, first_name, last_name, phone, email, status,
        balance_owed, account_balance,
        test_date, test_time, test_centre,
        test_centre_id,
        prepaid_hours, prepaid_amount_paid,
        notes, profile_image_url, photo_url, photo_consent,
        address, postcode, lead_source, lead_source_detail,
        theory_pass, wants_swap,
        ni_amount_total, ni_amount_paid, ni_payer, ni_payment_date, ni_reference,
        emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
        driving_licence_number, driving_licence_checked, custom_rate, custom_rate_90, custom_rate_120,
        buffer_after_minutes, calendar_colour,
        theory_status, theory_test_date, theory_pass_date, theory_score,
        test_status, test_examiner
      `)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error("[pupil] fetch error", error);
        const p = (data as Pupil) ?? null;
        setPupil(p);
        setNotesDraft(p?.notes ?? "");
        console.log("[pupils.$id] pupil data:", p, "balance_owed:", p?.balance_owed, "account_balance:", p?.account_balance);
        if (p?.test_centre_id) {
          supabase
            .from("test_centres")
            .select("id, name, town")
            .eq("id", p.test_centre_id)
            .maybeSingle()
            .then(({ data: tc }) => setCentreInfo((tc as any) ?? null));
        } else {
          setCentreInfo(null);
        }
      });


    // Unread messages from this pupil (for Message quick-action badge)
    supabase.auth.getUser().then(({ data: u }) => {
      const uid = u.user?.id;
      if (!uid) return;
      supabase
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("pupil_id", id)
        .eq("instructor_id", uid)
        .eq("sender_type", "pupil")
        .is("read_at", null)
        .is("deleted_at", null)
        .then(({ count, error }) => {
          if (error) {
            console.error("[pupil] unread chat count error", error);
            return;
          }
          setUnreadMessages(count ?? 0);
        });
    });


    // Fetch unpaid, non-cancelled lessons — the "owed" balance is computed
    // from the pupil's CURRENT rates in a separate effect below, so it
    // stays correct even if the stored amount_due was written when the
    // pupil's rate or postcode pricing was different.
    supabase
      .from("lessons")
      .select("duration_minutes, amount_due, payment_status, status")
      .eq("pupil_id", id)
      .is("deleted_at", null)
      .neq("status", "cancelled")
      .then(({ data, error }) => {
        if (error) {
          console.error("[pupil] unpaid lessons error", error);
          return;
        }
        const rows = (data as { duration_minutes: number | null; amount_due: number | null; payment_status: string | null }[]) ?? [];
        setUnpaidLessons(rows.filter((r) => r.payment_status !== "paid"));
      });

    supabase
      .from("lesson_history")
      .select("lesson_cost, payment_status")
      .eq("pupil_id", id)
      .is("deleted_at", null)
      .then(({ data, error }) => {
        if (error) console.error("[pupil] lesson_history error", error);
        const rows = (data as { lesson_cost: number | null; payment_status: string | null }[]) ?? [];
        const totalCost = rows.reduce((s, r) => s + (Number(r.lesson_cost) || 0), 0);
        const totalPaid = rows
          .filter((r) => r.payment_status === "paid")
          .reduce((s, r) => s + (Number(r.lesson_cost) || 0), 0);
        const bal = totalPaid - totalCost;
        setBalance(bal);
        console.log("[pupils.$id] balance:", bal, "totalCost:", totalCost, "totalPaid:", totalPaid);
      });

    supabase
      .from("lesson_history")
      .select("id, lesson_id, lesson_cost, payment_method, created_at, notes")
      .eq("pupil_id", id)
      .eq("payment_status", "paid")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data, error }) => {
        if (error) console.error("[pupil] payment history error", error);
        setPaymentHistory((data as any[]) ?? []);
      });

    supabase
      .from("lessons")
      .select("id, lesson_date, lesson_time, duration_minutes, status, amount_due, payment_status, notes, eol_completed")
      .eq("pupil_id", id)
      .is("deleted_at", null)
      .neq("status", "cancelled")
      .neq("status", "completed")
      .gte("lesson_date", ymd(new Date()))
      .order("lesson_date", { ascending: true })
      .order("lesson_time", { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error("[pupil] lessons error", error);
        setLessons((data as Lesson[]) ?? []);
      });

    supabase
      .from("lessons")
      .select("id, lesson_date, lesson_time, duration_minutes, status, amount_due, payment_status, notes, eol_completed, cancellation_reason")
      .eq("pupil_id", id)
      .is("deleted_at", null)
      .or(`status.eq.completed,status.eq.cancelled,lesson_date.lt.${ymd(new Date())}`)
      .order("lesson_date", { ascending: false })
      .order("lesson_time", { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (error) console.error("[pupil] past lessons error", error);
        setPastLessons((data as Lesson[]) ?? []);
      });

    // Hours completed: sum duration_minutes for confirmed/completed lessons
    supabase
      .from("lessons")
      .select("duration_minutes")
      .eq("pupil_id", id)
      .is("deleted_at", null)
      .in("status", ["confirmed", "completed"])
      .then(({ data }) => {
        const mins = (data ?? []).reduce(
          (s: number, r: { duration_minutes: number | null }) =>
            s + Number(r.duration_minutes ?? 0),
          0,
        );
        setHoursCompleted(mins / 60);
      });

    // Instructor hourly rate fallback
    supabase.auth.getUser().then(({ data: u }) => {
      const uid = u?.user?.id;
      if (!uid) return;
      supabase
        .from("instructors")
        .select("hourly_rate, first_name, last_name, business_name")
        .eq("id", uid)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.hourly_rate != null) setInstructorRate(Number(data.hourly_rate));
          const d = data as { first_name?: string | null; last_name?: string | null; business_name?: string | null } | null;
          const nm = [d?.first_name, d?.last_name].filter(Boolean).join(" ").trim() || d?.business_name || "";
          setInstructorName(nm);
        });
      supabase
        .from("instructor_postcode_rates")
        .select("outward_code, hourly_rate")
        .eq("instructor_id", uid)
        .then(({ data, error }) => {
          if (error) {
            console.error("[pupil] postcode rates error", error);
            return;
          }
          setPostcodeRates(((data as any[]) ?? []).map((r) => ({
            outward_code: String(r.outward_code || "").toUpperCase(),
            hourly_rate: Number(r.hourly_rate) || 0,
          })));
        });
    });

    supabase
      .from("pupil_progress")
      .select("status")
      .eq("pupil_id", id)
      .then(({ data, error }) => {
        if (error) console.error("[pupil] progress error", error);
        const rows = (data as { status: string }[]) ?? [];
        const total = rows.length;
        const competent = rows.filter(
          (r) => r.status === "independent" || r.status === "competent",
        ).length;
        setProgressData({ total, competent });
      });

    supabase
      .from("pupil_syllabus_progress")
      .select("level, status")
      .eq("pupil_id", id)
      .then(({ data, error }) => {
        if (error) {
          console.error("[pupil] syllabus error", error);
          setSyllabusPct(0);
          return;
        }
        const rows = (data as { level: number; status: string }[]) ?? [];
        setSyllabus(rows);
        const total = rows.reduce((s, r) => s + (Number(r.level) || 0), 0);
        setSyllabusSum(total);
        // 27 competencies × 5 max
        setSyllabusPct(Math.round((total / (27 * 5)) * 100));
      });

    supabase
      .from("intake_answers")
      .select("*, intake_questions(question, type)")
      .eq("pupil_id", id)
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error("[pupil] intake answers error", error);
        setIntakeAnswers(data ?? []);
      });
  }, [id, paymentHistoryRefresh]);

  // Recompute live "owed" from the pupil's CURRENT rates.
  // Priority (per resolveHourlyRate): pupil custom rate (per-duration) >
  // postcode rate > instructor default. Falls back to stored amount_due
  // only if no rate inputs are available at all.
  useEffect(() => {
    if (unpaidLessons === null) return;
    if (unpaidLessons.length === 0) {
      setLiveOwed(0);
      return;
    }
    // Single source of truth: sum stored lessons.amount_due for unpaid lessons.
    const owed = unpaidLessons.reduce((sum, l) => sum + (Number(l.amount_due) || 0), 0);
    setLiveOwed(Math.round(owed * 100) / 100);
  }, [unpaidLessons]);

  async function removePupil() {
    setRemoveOpen(false);
    const { error } = await supabase
      .from("pupils")
      .update({ deleted_at: new Date().toISOString(), status: "inactive" })
      .eq("id", id);
    if (error) {
      console.error("[pupil] remove error", error);
      return;
    }
    navigate({ to: "/pupils" });
  }

  async function saveNotes() {
    setSavingNotes(true);
    setNoteSaved(false);
    const { error } = await supabase
      .from("pupils")
      .update({ notes: notesDraft })
      .eq("id", id);
    setSavingNotes(false);
    if (error) {
      console.error("[pupil] save notes error", error);
      toast.error("Failed to save — please try again");
      return;
    }
    setNoteSaved(true);
    toast.success("Notes saved");
    setTimeout(() => setNoteSaved(false), 2000);
  }

  async function onPickPupilPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!/^image\//.test(f.type)) return;
    if (f.size > 8 * 1024 * 1024) return;
    setUploadingPhoto(true);
    try {
      const ext = f.name.split(".").pop() ?? "jpg";
      const path = `${id}/${Date.now()}.${ext}`;
      const up = await supabase.storage
        .from("pupil-photos")
        .upload(path, f, { contentType: f.type, upsert: true });
      if (up.error) throw up.error;
      const { data: pub } = supabase.storage.from("pupil-photos").getPublicUrl(path);
      const publicUrl = pub.publicUrl;
      const { error } = await supabase
        .from("pupils")
        .update({ photo_url: publicUrl, profile_image_url: publicUrl })
        .eq("id", id);
      if (error) throw error;
      setPupil((p) => (p ? { ...p, photo_url: publicUrl, profile_image_url: publicUrl } : p));

      toast.success("Photo uploaded");
    } catch (err) {
      console.error("[pupil] photo upload", err);
      toast.error("Failed to save — please try again");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function togglePhotoConsent(value: boolean) {
    setPupil((p) => (p ? { ...p, photo_consent: value } : p));
    const { error } = await supabase
      .from("pupils")
      .update({ photo_consent: value })
      .eq("id", id);
    if (error) {
      console.error("[pupil] consent error", error);
      toast.error("Failed to save — please try again");
      setPupil((p) => (p ? { ...p, photo_consent: !value } : p));
    } else {
      toast.success("Photo consent updated");
    }
  }

  const badge = statusBadge(pupil?.status ?? null);
  const allLessons = (lessons ?? []).concat(pastLessons ?? []);
  const completedLessonCount = allLessons.filter(l => l.status === 'completed' && l.deleted_at === null).length || 0;
  const confirmedLessonCount = allLessons.filter(l => ['confirmed', 'completed', 'in_progress'].includes(l.status) && l.deleted_at === null).length || 0;

  return (
    <div className="min-h-screen bg-slate-50 pb-8" style={POPPINS}>
      {/* Top bar — Structured clarity: white sticky header */}
      <div
        className="sticky top-0 z-40 flex items-center justify-between px-2 bg-white border-b border-slate-200"
        style={{ height: 52 }}
      >
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate({ to: "/pupils" })}
          className="flex items-center justify-center text-slate-600"
          style={{ width: 40, height: 40 }}
        >
          <ArrowLeft size={22} />
        </button>
        <div
          className="flex-1 text-center text-[15px] font-semibold text-slate-900 truncate px-2"
          style={POPPINS}
        >
          {pupil?.name ?? ""}
        </div>
        <div className="flex items-center">
          <a
            href={pupil?.phone ? `tel:${pupil.phone}` : undefined}
            aria-label="Call pupil"
            className="flex items-center justify-center text-blue-600"
            style={{ width: 40, height: 40 }}
          >
            <Phone size={18} />
          </a>
          <button
            type="button"
            aria-label="Edit pupil"
            onClick={openEditSheet}
            className="flex items-center justify-center text-slate-600 hover:text-blue-600"
            style={{ width: 40, height: 40 }}
          >
            <Pencil size={18} />
          </button>
          <button
            type="button"
            aria-label="Remove pupil"
            onClick={() => setRemoveOpen(true)}
            className="flex items-center justify-center text-slate-400 hover:text-red-600"
            style={{ width: 40, height: 40 }}
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
      {/* Profile header card */}
      {pupil && (
        <div className="mt-0 overflow-hidden rounded-b-[28px]">
            {/* Blue hero band */}
            <div
              className="relative px-4 rounded-b-[28px]"
              style={{ backgroundColor: "#1877D6", paddingTop: 22, paddingBottom: 76 }}
            >
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 relative z-10">
                <div className="flex items-start gap-3 min-w-0">
                  <input
                    ref={photoRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={onPickPupilPhoto}
                  />
                  <button
                    type="button"
                    onClick={() => !uploadingPhoto && photoRef.current?.click()}
                    disabled={uploadingPhoto}
                    aria-label="Upload pupil photo"
                    className="relative flex items-center justify-center rounded-full shrink-0 overflow-hidden"
                    style={{
                      width: 80,
                      height: 80,
                      border: "4px solid rgba(255,255,255,0.25)",
                      backgroundColor: "rgba(255,255,255,0.08)",
                      color: "#FFFFFF",
                      ...POPPINS,
                    }}
                  >
                    {pupil.photo_url ? (
                      <img src={pupil.photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[24px] font-semibold">{initials(pupil.name)}</span>
                    )}
                    {uploadingPhoto && (
                      <span
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
                      >
                        <Loader2 size={22} color="#FFFFFF" className="animate-spin" />
                      </span>
                    )}
                    <span
                      className="absolute -bottom-1 -right-1 flex items-center justify-center rounded-full"
                      style={{
                        width: 24,
                        height: 24,
                        backgroundColor: "#00B5A5",
                        border: "2px solid #1877D6",
                      }}
                    >
                      <Camera size={13} color="#FFFFFF" />
                    </span>
                  </button>
                  <div className="text-white min-w-0 flex-1 pt-1">
                    <h1 className="text-[20px] font-bold leading-tight truncate" style={POPPINS}>
                      {pupil.name}
                    </h1>
                    {!emailEditing ? (
                      <button
                        type="button"
                        onClick={() => {
                          setEmailDraft(pupil.email ?? "");
                          setEmailEditing(true);
                        }}
                        className="text-[13px] font-medium truncate mt-0.5 flex items-center gap-1.5 w-full text-left"
                        style={{ color: "rgba(255,255,255,0.85)", ...POPPINS }}
                      >
                        <span className="truncate">{pupil.email || "No email set"}</span>
                        <Pencil size={12} color="rgba(255,255,255,0.7)" />
                      </button>
                    ) : (
                      <div className="mt-0.5 flex flex-col gap-1.5">
                        <input
                          type="email"
                          value={emailDraft}
                          onChange={(e) => setEmailDraft(e.target.value)}
                          placeholder="Email address"
                          disabled={savingEmail}
                          className="w-full rounded-md px-2 py-1 text-[13px] text-[#0B1F3A] focus:outline-none focus:ring-2 focus:ring-white/60"
                          style={{ background: "rgba(255,255,255,0.95)", ...POPPINS }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEmail();
                            if (e.key === "Escape") setEmailEditing(false);
                          }}
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={saveEmail}
                            disabled={savingEmail}
                            className="flex-1 h-8 rounded-md text-[12px] font-semibold text-[#1877D6] bg-white disabled:opacity-60"
                            style={POPPINS}
                          >
                            {savingEmail ? "Saving…" : "Save"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEmailEditing(false)}
                            disabled={savingEmail}
                            className="h-8 px-3 rounded-md text-[12px] font-semibold text-white border border-white/40"
                            style={{ background: "transparent", ...POPPINS }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    <span
                      className="mt-2 inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                      style={{ backgroundColor: "#00B5A5", color: "#0F2044", ...POPPINS }}
                    >
                      {badge.label}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate({ to: "/pupils/history/$id", params: { id } })}
                  className="text-right text-white shrink-0 cursor-pointer pt-1"
                  style={{ background: "none", border: "none", padding: 0 }}
                >
                  <p
                    className="text-[10px] font-semibold uppercase tracking-widest"
                    style={{ color: "rgba(255,255,255,0.6)", ...POPPINS }}
                  >
                    Lessons bought
                  </p>
                  <p className="text-[32px] font-bold leading-none mt-1" style={POPPINS}>
                    {confirmedLessonCount}
                  </p>
                </button>
              </div>
            </div>

            {/* Floating white information card */}
            <div className="mx-4 -mt-16 relative z-20">
              <div
                className="rounded-2xl p-5 space-y-5"
                style={{
                  backgroundColor: "#FFFFFF",
                  boxShadow: "0 10px 40px -15px rgba(15,32,68,0.18)",
                }}
              >
                {/* Photo consent row */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <span className="text-[14px] font-medium text-slate-700" style={POPPINS}>
                    Photo consent
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={Boolean(pupil.photo_consent)}
                      onChange={(e) => togglePhotoConsent(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div
                      className="w-11 h-6 rounded-full transition-colors"
                      style={{ backgroundColor: pupil.photo_consent ? "#00B5A5" : "#CBD5E1" }}
                    />
                    <div
                      className="absolute top-[2px] left-[2px] bg-white border border-gray-300 rounded-full h-5 w-5 transition-transform"
                      style={{
                        transform: pupil.photo_consent ? "translateX(20px)" : "translateX(0)",
                      }}
                    />
                  </label>
                </div>

                {/* Balance + Practical test tiles */}
                {(() => {
                  const outstanding = liveOwed ?? 0;
                  const credit = Number(pupil.account_balance ?? 0);
                  const net = outstanding - credit;
                  const balanceColor = net > 0 ? "#EF4444" : net < 0 ? "#22C55E" : "#FFFFFF";
                  const balanceValue =
                    net > 0
                      ? `£${net.toFixed(2)}`
                      : net < 0
                        ? `£${Math.abs(net).toFixed(2)}`
                        : "All paid";
                  const testValue = pupil.test_date ? formatTestDate(pupil.test_date) : "No test";
                  const testSub = pupil.test_date
                    ? [
                        pupil.test_time ? formatTime(pupil.test_time) : null,
                        centreInfo?.name || pupil.test_centre || null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || undefined
                    : undefined;
                  return (
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => navigate({ to: "/pupils/payments/$id", params: { id } })}
                        className="text-left rounded-xl p-4"
                        style={{ backgroundColor: "#0F2044" }}
                      >
                        <p
                          className="text-[10px] font-bold uppercase tracking-widest"
                          style={{ color: "rgba(255,255,255,0.5)", ...POPPINS }}
                        >
                          Account balance
                        </p>
                        <p
                          className="text-[20px] font-bold mt-1"
                          style={{ color: balanceColor, ...POPPINS }}
                        >
                          {balanceValue}
                        </p>
                      </button>
                      <div
                        className="rounded-xl p-4 border"
                        style={{ backgroundColor: "#F9FAFB", borderColor: "#F1F5F9" }}
                      >
                        <p
                          className="text-[10px] text-slate-400 font-bold uppercase tracking-widest"
                          style={POPPINS}
                        >
                          Practical test
                        </p>
                        <p
                          className="text-[14px] font-semibold text-[#0F2044] mt-1 leading-tight"
                          style={POPPINS}
                        >
                          {testValue}
                        </p>
                        {testSub && (
                          <p
                            className="text-[11px] text-slate-500 truncate mt-0.5"
                            style={POPPINS}
                            title={testSub}
                          >
                            {testSub}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Readiness dashboard */}
                {(() => {
                  const readiness = (() => {
                    const lessonCount = completedLessonCount;
                    const syllabusAchieved = syllabus?.filter((s) => s.status === "achieved")?.length || 0;
                    const theoryPassed = pupil?.theory_status === "Passed";
                    if (lessonCount === 0 && theoryPassed) {
                      return { score: 10, syllabusPoints: 0, lessonPoints: 0, theoryPoints: 10 };
                    }
                    if (lessonCount === 0 && !theoryPassed && syllabusAchieved === 0) {
                      return { score: 0, syllabusPoints: 0, lessonPoints: 0, theoryPoints: 0 };
                    }
                    const syllabusPoints = syllabusSum > 0 ? Math.min((syllabusSum / 135) * 60, 60) : 0;
                    const lessonPoints = lessonCount === 0 ? 0 : Math.min((lessonCount / 40) * 30, 30);
                    const theoryPoints = theoryPassed ? 10 : 0;
                    const score = Math.round(syllabusPoints + lessonPoints + theoryPoints);
                    return { score, syllabusPoints, lessonPoints, theoryPoints };
                  })();
                  const theoryPassed = pupil.theory_status === "Passed";
                  const practBooked = Boolean(pupil.test_date);
                  const segments = 5;
                  const filled = Math.round((readiness.score / 100) * segments);
                  return (
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-end justify-between mb-2">
                          <h3
                            className="text-[11px] font-bold text-slate-400 uppercase tracking-widest"
                            style={POPPINS}
                          >
                            Readiness dashboard
                          </h3>
                          <button
                            type="button"
                            onClick={() => navigate({ to: "/pupils/syllabus/$id", params: { id } })}
                            className="text-[18px] font-bold leading-none"
                            style={{ color: "#1877D6", background: "none", border: "none", padding: 0, ...POPPINS }}
                          >
                            {readiness.score}%
                          </button>
                        </div>
                        <div className="flex gap-1 h-2 mb-3">
                          {Array.from({ length: segments }).map((_, i) => (
                            <div
                              key={i}
                              className={"flex-1 " + (i === 0 ? "rounded-l-full " : "") + (i === segments - 1 ? "rounded-r-full" : "")}
                              style={{ backgroundColor: i < filled ? "#00B5A5" : "#E5E7EB" }}
                            />
                          ))}
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: "Syllabus", value: Math.round(readiness.syllabusPoints), max: 60 },
                            { label: "Lessons", value: completedLessonCount, max: confirmedLessonCount },
                            { label: "Theory", value: readiness.theoryPoints, max: 10 },
                          ].map((s) => (
                            <div key={s.label} className="flex flex-col">
                              <span className="text-[10px] font-medium text-slate-500" style={POPPINS}>{s.label}</span>
                              <span className="text-[12px] font-bold text-[#0F2044]" style={POPPINS}>
                                {s.value}
                                <span className="text-slate-400 font-medium">/{s.max}</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div
                          className="flex items-center gap-3 p-3 rounded-xl border"
                          style={{
                            backgroundColor: theoryPassed ? "rgba(0,181,165,0.05)" : "#F9FAFB",
                            borderColor: theoryPassed ? "rgba(0,181,165,0.2)" : "#F1F5F9",
                          }}
                        >
                          <div
                            className="p-2 rounded-lg shrink-0 flex items-center justify-center"
                            style={{ backgroundColor: theoryPassed ? "#00B5A5" : "#94A3B8" }}
                          >
                            {theoryPassed ? <Check size={14} color="#FFFFFF" /> : <BookOpen size={14} color="#FFFFFF" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider" style={POPPINS}>Theory</p>
                            <p className="text-[12px] font-semibold text-[#0F2044] truncate" style={POPPINS}>
                              {pupil.theory_status || "Not started"}
                            </p>
                          </div>
                        </div>
                        <div
                          className="flex items-center gap-3 p-3 rounded-xl border"
                          style={{
                            backgroundColor: practBooked ? "rgba(204,34,41,0.05)" : "#F9FAFB",
                            borderColor: practBooked ? "rgba(204,34,41,0.2)" : "#F1F5F9",
                          }}
                        >
                          <div
                            className="p-2 rounded-lg shrink-0 flex items-center justify-center"
                            style={{ backgroundColor: practBooked ? "#CC2229" : "#94A3B8" }}
                          >
                            <Car size={14} color="#FFFFFF" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider" style={POPPINS}>Practical</p>
                            <p className="text-[12px] font-semibold text-[#0F2044] truncate" style={POPPINS}>
                              {pupil.test_status || (practBooked ? "Booked" : "Not booked")}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}


                {/* Recent payments */}
                {paymentHistory.length > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    <div
                      className="text-[11px] font-medium uppercase mb-2"
                      style={{ color: "#6B7280", letterSpacing: "0.05em", ...POPPINS }}
                    >
                      Recent payments
                    </div>
                    <div className="flex flex-col" style={{ borderTop: "0.5px solid #EEF2F7" }}>
                      {paymentHistory.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between py-2"
                          style={{ borderBottom: "0.5px solid #EEF2F7" }}
                        >
                          <div className="flex flex-col">
                            <span className="text-[13px] font-semibold" style={{ color: "#0B1F3A", ...POPPINS }}>
                              £{Number(p.lesson_cost ?? 0).toFixed(2)}
                            </span>
                            <span className="text-[11px]" style={{ color: "#6B7280", ...POPPINS }}>
                              {new Date(p.created_at).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                              {p.payment_method ? ` · ${p.payment_method}` : ""}
                            </span>
                          </div>
                          <button
                            type="button"
                            aria-label="Delete payment"
                            onClick={async () => {
                              if (!window.confirm("Delete this payment? This will restore the lesson balance.")) return;
                              const { data: { session } } = await supabase.auth.getSession();
                              const token = session?.access_token;
                              if (!token) {
                                toast.error("Not authenticated");
                                return;
                              }
                              const { data: userData } = await supabase.auth.getUser();
                              const uid = userData.user?.id;
                              if (!uid) return;
                              const ok = await deletePaymentRecord(p.id, token, uid);
                              if (ok) {
                                // Fix 2: also soft-delete the legacy `payments` row for this lesson
                                if (p.lesson_id) {
                                  const { error: payDelErr } = await supabase
                                    .from("payments")
                                    .update({ deleted_at: new Date().toISOString() })
                                    .eq("lesson_id", p.lesson_id)
                                    .is("deleted_at", null);
                                  if (payDelErr) console.error("[pupil] payments soft-delete error", payDelErr);
                                }
                                setPaymentHistoryRefresh((n) => n + 1);
                              }
                            }}
                            className="inline-flex items-center justify-center rounded-full"
                            style={{
                              width: 28,
                              height: 28,
                              background: "#F3F4F6",
                              border: "0.5px solid #E2E6ED",
                              color: "#6B7280",
                            }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
      )}
      <div className="mx-auto w-full md:max-w-3xl md:px-4 md:pt-4">
        <div className="px-4">
        <SectionHeader>QUICK ACTIONS</SectionHeader>
        <div className="grid grid-cols-3 gap-2">
          <ActionTile
            label="Call"
            icon={<Phone size={20} />}
            iconBg="#EAF3FB"
            iconColor="#1877D6"
            href={pupil?.phone ? `tel:${pupil.phone}` : undefined}
          />
          <ActionTile
            label="Message"
            icon={<MessageSquare size={20} />}
            iconBg="#00B5A5"
            iconColor="#FFFFFF"
            onClick={() => navigate({ to: "/messages/$pupilId", params: { pupilId: id } })}
            badge={unreadMessages > 0 ? String(unreadMessages) : undefined}
          />
          <ActionTile
            label="Text"
            icon={<MessageSquare size={20} />}
            iconBg="#EAF3FB"
            iconColor="#1877D6"
            href={pupil?.phone ? `sms:${pupil.phone}` : undefined}
          />
          <ActionTile
            label="Add lesson"
            icon={<Plus size={22} />}
            iconBg="#DCFCE7"
            iconColor="#16A34A"
            onClick={() => navigate({ to: "/lessons/new" })}
          />
          <ActionTile
            label="Certificate"
            icon={<Award size={20} />}
            iconBg="#FEF3C7"
            iconColor="#B45309"
            onClick={() => setCertOpen(true)}
          />
          <ActionTile
            label="History"
            icon={<Clock size={20} />}
            iconBg="#F3E8FF"
            iconColor="#7C3AED"
            onClick={() => navigate({ to: "/pupils/history/$id", params: { id } })}
          />
          <ActionTile
            label="Progress"
            icon={<BarChart3 size={20} />}
            iconBg="#E0F2FE"
            iconColor="#0369A1"
            onClick={() => navigate({ to: "/pupils/progress/$id", params: { id } })}
          />
          <ActionTile
            label="Syllabus"
            icon={<BookOpen size={20} />}
            iconBg="#F1F5F9"
            iconColor="#0B1F3A"
            onClick={() => navigate({ to: "/pupils/syllabus/$id", params: { id } })}
            badge={syllabusPct == null ? undefined : `${syllabusPct}%`}
          />
          <ActionTile
            label="Test day"
            icon={<Flag size={20} />}
            iconBg="#FEF3C7"
            iconColor="#B45309"
            onClick={() => navigate({ to: "/test-day/$pupilId", params: { pupilId: id } })}
          />
          <ActionTile
            label="Mock test"
            icon={<ClipboardCheck size={20} />}
            iconBg="#CFFAFE"
            iconColor="#0891B2"
            onClick={() => navigate({ to: "/mock-tests/$pupilId", params: { pupilId: id } })}
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
          <ActionTile
            label="Reflective log"
            icon={<BookOpen size={20} />}
            iconBg="#F3E8FF"
            iconColor="#7C3AED"
            onClick={() => navigate({ to: "/reflective-log/$pupilId", params: { pupilId: id } })}
          />
          <ActionTile
            label="Test result"
            icon={<Trophy size={20} />}
            iconBg="#FEF3C7"
            iconColor="#B45309"
            onClick={() => navigate({ to: "/driving-test/$pupilId", params: { pupilId: id } })}
          />
        </div>
      {/* Test status tiles */}
      {pupil && (() => {
        const showTheory = pupil.theory_status && pupil.theory_status !== "Not started";
        const showPractical = !!pupil.test_date;
        if (!showTheory && !showPractical) return null;
        const theoryBadge = statusColour(pupil.theory_status);
        const practBadge = statusColour(pupil.test_status);
        const centreName = centreInfo?.name || pupil.test_centre || "";
        const theoryDescription =
          pupil.theory_status === "Passed"
            ? `Passed${pupil.theory_pass_date ? ` on ${fmtUKDate(pupil.theory_pass_date)}` : ""}`
            : pupil.theory_status === "Failed"
              ? `Failed${pupil.theory_test_date ? ` on ${fmtUKDate(pupil.theory_test_date)}` : ""}`
              : pupil.theory_test_date
                ? `Booked for ${fmtUKDate(pupil.theory_test_date)}`
                : pupil.theory_status || "Studying";
        const practicalDescription = [
          pupil.test_status || "Booked",
          pupil.test_date ? fmtUKDate(pupil.test_date) : null,
          pupil.test_time ? pupil.test_time.slice(0, 5) : null,
          centreName || null,
          pupil.test_examiner || null,
        ]
          .filter(Boolean)
          .join(" · ");
        return (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {showTheory && (
              <ActionTile
                label="Theory test"
                icon={<BookOpen size={20} />}
                iconBg={theoryBadge.bg}
                iconColor={theoryBadge.fg}
                description={theoryDescription}
                orientation="horizontal"
              />
            )}
            {showPractical && (
              <ActionTile
                label="Practical test"
                icon={<Car size={20} />}
                iconBg={practBadge.bg}
                iconColor={practBadge.fg}
                description={practicalDescription}
                orientation="horizontal"
              />
            )}
          </div>
        );
      })()}
        <SectionHeader>UPCOMING LESSONS</SectionHeader>
        {lessons === null ? null : lessons.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-[14px] text-[#6B7280]" style={POPPINS}>
              No upcoming lessons
            </p>
          </div>
        ) : (
          <div style={{ background: "#FFFFFF", borderRadius: 16, overflow: "hidden", border: "0.5px solid rgba(15,32,68,0.10)" }}>
            {lessons.map((l, idx) => {
              const d = new Date(`${l.lesson_date}T00:00:00`);
              const prev = idx > 0 ? lessons[idx - 1] : null;
              const gapDays = prev ? daysBetween(prev.lesson_date, l.lesson_date) : 0;
              const live = isLessonLive(l);
              const past = isLessonPast(l);
              const stored = Number(l.amount_due ?? 0);
              const computed = resolveHourlyRate({
                pupilCustomRate: pupil?.custom_rate ?? null,
                pupilCustomRate90: pupil?.custom_rate_90 ?? null,
                pupilCustomRate120: pupil?.custom_rate_120 ?? null,
                pupilPostcode: pupil?.postcode ?? null,
                instructorDefaultRate: instructorRate ?? null,
                postcodeRates,
                durationMinutes: Number(l.duration_minutes) || 60,
              });
              const price = computed > 0 ? computed : stored;
              const isPaid = l.payment_status === "paid";
              const unpaid = !isPaid && price > 0;
              const showGap = gapDays > 7;
              const colour = pupil?.calendar_colour || "#1A52A0";
              const initials = (pupil?.name ?? "P").split(/\s+/).map((s) => s.charAt(0)).join("").slice(0, 2).toUpperCase();

              return (
                <Fragment key={l.id}>
                  {showGap && (
                    <div className="flex items-center justify-center py-3" style={{ borderTop: idx === 0 ? "none" : "0.5px solid rgba(15,32,68,0.10)" }}>
                      <span className="text-[11px]" style={{ color: "#9CA3AF", ...POPPINS }}>
                        {gapDays} day{gapDays > 1 ? "s" : ""} gap
                      </span>
                    </div>
                  )}
                  <div
                    onClick={() => navigate({ to: "/lessons/$id", params: { id: l.id } })}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 12,
                      padding: "12px 16px", cursor: "pointer",
                      borderTop: idx === 0 || showGap ? "none" : "0.5px solid rgba(15,32,68,0.10)",
                      ...POPPINS,
                    }}
                  >
                    <div style={{ width: 40, height: 40, borderRadius: 999, background: colour, color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, letterSpacing: 0.2, flexShrink: 0 }}>
                      {initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "#0F2044", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", ...POPPINS }}>
                        {formatDateShort(d)}
                      </div>
                      <div style={{ fontSize: 12, color: "#64748B", marginTop: 2, fontVariantNumeric: "tabular-nums", ...POPPINS }}>
                        {formatTime(l.lesson_time)} · {l.duration_minutes ?? 60} mins
                      </div>
                    </div>
                    {live ? (
                      <span style={{ background: "#DBEAFE", color: "#1A52A0", fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 999, ...POPPINS }}>Live</span>
                    ) : unpaid && past ? (
                      <span style={{ background: "#FDECC8", color: "#8A5A00", fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 999, ...POPPINS }}>£{price.toFixed(0)}</span>
                    ) : isPaid ? (
                      <span style={{ background: "#E7F7EC", color: "#137333", fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 999, ...POPPINS }}>Paid ✓</span>
                    ) : past && l.status !== "cancelled" && !l.eol_completed ? (
                      <span style={{ background: "#E7F7EC", color: "#137333", fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 999, ...POPPINS }}>EOL</span>
                    ) : null}
                    <ChevronRight size={18} color="#64748B" />
                  </div>
                </Fragment>
              );
            })}
          </div>
        )}


        <SectionHeader>LAST LESSONS</SectionHeader>
        {pastLessons === null ? null : pastLessons.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-[14px] text-[#6B7280]" style={POPPINS}>
              No past lessons
            </p>
          </div>
        ) : (
          <div style={{ background: "#FFFFFF", borderRadius: 16, overflow: "hidden", border: "0.5px solid rgba(15,32,68,0.10)" }}>
            {(() => {
              const visible = pastExpanded ? pastLessons : pastLessons.slice(0, 5);
              const colour = pupil?.calendar_colour || "#1A52A0";
              const initials = (pupil?.name ?? "P").split(/\s+/).map((s) => s.charAt(0)).join("").slice(0, 2).toUpperCase();
              return (
                <>
                  {visible.map((l, idx) => {
                    const d = new Date(`${l.lesson_date}T00:00:00`);
                    const isPaid = l.payment_status === "paid";
                    const isCancelled = l.status === "cancelled";
                    const prev = idx > 0 ? visible[idx - 1] : null;
                    const gapDays = prev ? daysBetween(l.lesson_date, prev.lesson_date) : 0;
                    const showGap = gapDays > 7;
                    return (
                      <Fragment key={l.id}>
                        {showGap && (
                          <div className="flex items-center justify-center py-3" style={{ borderTop: idx === 0 ? "none" : "0.5px solid rgba(15,32,68,0.10)" }}>
                            <span className="text-[11px]" style={{ color: "#9CA3AF", ...POPPINS }}>
                              {gapDays} day{gapDays > 1 ? "s" : ""} gap
                            </span>
                          </div>
                        )}
                        <div
                          onClick={() => navigate({ to: "/lessons/$id", params: { id: l.id } })}
                          style={{
                            width: "100%", display: "flex", alignItems: "center", gap: 12,
                            padding: "12px 16px", cursor: "pointer",
                            borderTop: idx === 0 || showGap ? "none" : "0.5px solid rgba(15,32,68,0.10)",
                            ...POPPINS,
                          }}
                        >
                          <div style={{ width: 40, height: 40, borderRadius: 999, background: isCancelled ? "#E5E7EB" : colour, color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, letterSpacing: 0.2, flexShrink: 0 }}>
                            {initials}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 15, fontWeight: 600, color: isCancelled ? "#64748B" : "#0F2044", textDecoration: isCancelled ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", ...POPPINS }}>
                              {formatDateShort(d)}
                            </div>
                            <div style={{ fontSize: 12, color: "#64748B", marginTop: 2, fontVariantNumeric: "tabular-nums", ...POPPINS }}>
                              {formatTime(l.lesson_time)} · {l.duration_minutes ?? 60} mins
                            </div>
                          </div>
                          {isCancelled ? (
                            <span style={{ background: "#FDECEA", color: "#B42318", fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 999, ...POPPINS }}>Cancelled</span>
                          ) : isPaid ? (
                            <span style={{ background: "#E7F7EC", color: "#137333", fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 999, ...POPPINS }}>Paid ✓</span>
                          ) : null}
                          <ChevronRight size={18} color="#64748B" />
                        </div>
                      </Fragment>
                    );
                  })}
                  {pastLessons.length > 5 && (
                    <button
                      type="button"
                      onClick={() => setPastExpanded((v) => !v)}
                      className="w-full flex items-center justify-center gap-1 py-3 text-[12px] font-medium text-[#1877D6] active:opacity-70"
                      style={{ borderTop: "0.5px solid rgba(15,32,68,0.10)", background: "none", border: "none", ...POPPINS }}
                    >
                      {pastExpanded
                        ? "Show less"
                        : `Show ${pastLessons.length - 5} more`}
                      <ChevronDown
                        size={14}
                        color="#1877D6"
                        style={{ transform: pastExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
                      />
                    </button>
                  )}
                </>
              );
            })()}
          </div>
        )}


        <SectionHeader>NOTES</SectionHeader>
        <button
          type="button"
          onClick={() => setNotesOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-2 rounded-lg p-3 text-left bg-white focus:outline-none focus:border-[#1877D6]"
          style={{
            borderWidth: "0.5px",
            borderStyle: "solid",
            borderColor: "#EEF2F7",
            ...POPPINS,
          }}
        >
          <span className="text-[13px] truncate" style={{ color: notesDraft ? "#0B1F3A" : "#9CA3AF", ...POPPINS }}>
            {notesDraft ? notesDraft : "Add a note…"}
          </span>
          <ChevronRight
            size={16}
            color="#9CA3AF"
            style={{ transform: notesOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
          />
        </button>
        {notesOpen && (
          <div className="mt-2">
            <textarea
              rows={2}
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              placeholder="Add a note about this pupil…"
              className="w-full rounded-lg p-3 text-[13px] text-[#0B1F3A] bg-white focus:border-[#1877D6] focus:outline-none"
              style={{
                ...POPPINS,
                borderWidth: "0.5px",
                borderStyle: "solid",
                borderColor: "#EEF2F7",
                resize: "vertical",
              }}
            />
            <div className="mt-2 flex items-center justify-end gap-3">
              {noteSaved && (
                <span className="text-[12px]" style={{ color: "#1877D6", ...POPPINS }}>
                  Saved
                </span>
              )}
              <Button onClick={saveNotes} disabled={savingNotes} inline className="h-8 px-3 text-[12px]">
                {savingNotes ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        )}
      {/* Address (Google Places autocomplete) */}
      {pupil && (
        <div style={{ margin: "12px 0 0" }}>
          <div
            className="bg-white"
            style={{
              borderRadius: 12,
              border: "0.5px solid #E2E6ED",
              padding: 16,
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-2 text-[14px] font-semibold" style={{ color: "#0B1F3A", ...POPPINS }}>
                <MapPin size={16} color="#1A52A0" /> Address
              </span>
              <button
                type="button"
                onClick={() => setAddressEditing((v) => !v)}
                className="text-[12px] font-semibold"
                style={{ color: "#1877D6", background: "none", border: "none", padding: 0, ...POPPINS }}
              >
                {addressEditing ? "Cancel" : "Edit"}
              </button>
            </div>
            {addressEditing ? (
              <AddressEditor
                initialAddress={pupil.address ?? ""}
                initialPostcode={pupil.postcode ?? ""}
                inputRef={addressInputRef}
                onSave={saveAddressManual}
              />
            ) : (
              <div className="text-[13px]" style={{ color: pupil.address ? "#0B1F3A" : "#9CA3AF", ...POPPINS }}>
                {pupil.address || "No address on file"}
                {pupil.postcode ? (
                  <span className="ml-2" style={{ color: "#6B7280" }}>{pupil.postcode}</span>
                ) : null}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Emergency contact + driving licence */}
      {pupil && (
        <PupilExtras
        pupil={pupil}
        instructorRate={instructorRate}
        instructorName={instructorName}
        onUpdated={(patch) => setPupil((p) => (p ? { ...p, ...patch } : p))}
        />
      )}
      {/* Theory test card */}
      {pupil && (
        <div style={{ margin: "12px 0 0" }}>
          <div
            className="bg-white"
            style={{ borderRadius: 12, border: "0.5px solid #E2E6ED", padding: 16 }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="flex items-center gap-2 text-[14px] font-semibold" style={{ color: "#0B1F3A", ...POPPINS }}>
                <BookOpen size={16} color="#1A52A0" /> Theory test
              </span>
              <button
                type="button"
                onClick={() => setTheoryEditing((v) => !v)}
                className="text-[12px] font-semibold"
                style={{ color: "#1877D6", background: "none", border: "none", padding: 0, ...POPPINS }}
              >
                {theoryEditing ? "Cancel" : "Edit"}
              </button>
            </div>
            {theoryEditing ? (
              <TheoryEditor
                pupil={pupil}
                onSave={async (patch) => {
                  const ok = await savePupilFields(patch, "Theory test saved");
                  if (ok) setTheoryEditing(false);
                }}
              />
            ) : (
              <div className="text-[13px]" style={{ color: "#0B1F3A", ...POPPINS }}>
                <div>Status: <b>{pupil.theory_status || "Not started"}</b></div>
                {pupil.theory_test_date && (
                  <div style={{ color: "#6B7280", marginTop: 2 }}>Test date: {fmtUKDate(pupil.theory_test_date)}</div>
                )}
                {pupil.theory_pass_date && (
                  <div style={{ color: "#6B7280", marginTop: 2 }}>Pass date: {fmtUKDate(pupil.theory_pass_date)}</div>
                )}
                {typeof pupil.theory_score === "number" && (
                  <div style={{ color: "#6B7280", marginTop: 2 }}>Score: {pupil.theory_score}</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {/* Practical test card */}
      {pupil && (
        <div style={{ margin: "12px 0 0" }}>
          <div
            className="bg-white"
            style={{ borderRadius: 12, border: "0.5px solid #E2E6ED", padding: 16 }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="flex items-center gap-2 text-[14px] font-semibold" style={{ color: "#0B1F3A", ...POPPINS }}>
                <Car size={16} color="#0F2044" /> Practical test
              </span>
              <button
                type="button"
                onClick={async () => {
                  const next = !practicalEditing;
                  setPracticalEditing(next);
                  if (next && allCentres.length === 0) {
                    const { data } = await supabase
                      .from("test_centres")
                      .select("id, name, town")
                      .order("name", { ascending: true });
                    setAllCentres((data as any) ?? []);
                  }
                }}
                className="text-[12px] font-semibold"
                style={{ color: "#1877D6", background: "none", border: "none", padding: 0, ...POPPINS }}
              >
                {practicalEditing ? "Cancel" : "Edit"}
              </button>
            </div>
            {practicalEditing ? (
              <PracticalEditor
                pupil={pupil}
                centreInfo={centreInfo}
                allCentres={allCentres}
                pickerOpen={practicalCentrePickerOpen}
                setPickerOpen={setPracticalCentrePickerOpen}
                search={practicalCentreSearch}
                setSearch={setPracticalCentreSearch}
                onCentreSelect={(c) => setCentreInfo(c)}
                onSave={async (patch) => {
                  const ok = await savePupilFields(patch, "Practical test saved");
                  if (ok) setPracticalEditing(false);
                }}
              />
            ) : (
              <div className="text-[13px]" style={{ color: "#0B1F3A", ...POPPINS }}>
                <div>Status: <b>{pupil.test_status || "Not booked"}</b></div>
                {pupil.test_date && (
                  <div style={{ color: "#6B7280", marginTop: 2 }}>Date: {fmtUKDate(pupil.test_date)}</div>
                )}
                {pupil.test_time && (
                  <div style={{ color: "#6B7280", marginTop: 2 }}>Time: {pupil.test_time.slice(0, 5)}</div>
                )}
                {(centreInfo || pupil.test_centre) && (
                  <div style={{ color: "#6B7280", marginTop: 2 }}>
                    Centre: {centreInfo?.name || pupil.test_centre}
                    {centreInfo?.town ? `, ${centreInfo.town}` : ""}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {/* Intake answers */}
      <div className="px-4">
        <SectionHeader>INTAKE ANSWERS</SectionHeader>
        {intakeAnswers === null ? null : intakeAnswers.length === 0 ? (
          <div className="text-[14px] text-[#6B7280]" style={POPPINS}>
            No intake answers recorded
          </div>
        ) : (
          <div
            className="bg-white"
            style={{
              borderRadius: 12,
              borderWidth: "0.5px",
              borderStyle: "solid",
              borderColor: "#EEF2F7",
              padding: 16,
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <ClipboardList size={18} color="#1877D6" />
              <div className="text-[14px] font-semibold" style={{ color: "#0B1F3A", ...POPPINS }}>
                Intake answers
              </div>
            </div>
            {intakeAnswers.map((a, i) => (
              <div key={a.id}>
                <div className="text-[12px]" style={{ color: "#6B7280", ...POPPINS }}>
                  {a.intake_questions?.question ?? "Question"}
                </div>
                <div
                  className="text-[14px] font-semibold mt-0.5"
                  style={{ color: "#0B1F3A", ...POPPINS }}
                >
                  {a.answer ?? a.answer_text ?? String(a.value ?? "")}
                </div>
                {i < intakeAnswers.length - 1 && (
                  <div style={{ height: 0.5, backgroundColor: "#F3F4F6", margin: "12px 0" }} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
        {pupil && (
          <LeadSourceSection
            pupil={pupil}
            onSave={async (patch) => {
              await savePupilFields(patch, "Lead source updated");
            }}
          />
        )}
        {pupil?.lead_source === "National Intensive" && (() => {
          const total = Number(pupil.ni_amount_total ?? 0);
          const paid = Number(pupil.ni_amount_paid ?? 0);
          const outstanding = total - paid;
          let paidColor = "#1877D6";
          if (total > 0 && paid >= total) paidColor = "#1877D6";
          else if (paid > 0) paidColor = "#1877D6";
          const payerLabel =
            pupil.ni_payer === "national_intensives"
              ? "National Intensives (agency)"
              : pupil.ni_payer === "pupil"
              ? "Pupil direct"
              : "—";
          return (
            <div
              className="bg-white"
              style={{
                marginTop: 12,
                padding: 16,
                borderRadius: 12,
                borderWidth: "0.5px",
                borderStyle: "solid",
                borderColor: "#EEF2F7",
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: "#EEF4FB", color: "#1877D6", ...POPPINS }}
                >
                  National Intensive
                </span>
                <span
                  className="text-[13px] font-semibold"
                  style={{ color: "#0B1F3A", ...POPPINS }}
                >
                  Payment details
                </span>
              </div>
              <NIRow label="Total course fee" value={pupil.ni_amount_total != null ? `£${total.toFixed(2)}` : "—"} />
              <NIRow label="Paying party" value={payerLabel} />
              <NIRow
                label="Amount paid"
                value={`£${paid.toFixed(2)}`}
                valueColor={paidColor}
              />
              <NIRow
                label="Payment date"
                value={pupil.ni_payment_date ? new Date(`${pupil.ni_payment_date}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Not recorded"}
              />
              <NIRow label="Reference" value={pupil.ni_reference || "—"} />
              {total > 0 && (
                outstanding > 0 ? (
                  <div
                    style={{
                      marginTop: 12,
                      padding: "10px 12px",
                      borderRadius: 8,
                      backgroundColor: "#FEF2F2",
                      border: "1px solid #FECACA",
                      color: "#1877D6",
                      fontSize: 13,
                      fontWeight: 600,
                      ...POPPINS,
                    }}
                  >
                    £{outstanding.toFixed(2)} outstanding from National Intensives
                  </div>
                ) : (
                  <div
                    style={{
                      marginTop: 12,
                      padding: "10px 12px",
                      borderRadius: 8,
                      backgroundColor: "#F0FDF4",
                      border: "1px solid #DBEAFE",
                      color: "#1877D6",
                      fontSize: 13,
                      fontWeight: 600,
                      ...POPPINS,
                    }}
                  >
                    Fully paid ✓
                  </div>
                )
              )}

              {(() => {
                const prepaid = Number(pupil.prepaid_hours ?? 0);
                if (!(total > 0 || prepaid > 0)) return null;
                const effectiveRate =
                  total > 0 && prepaid > 0
                    ? total / prepaid
                    : instructorRate ?? 0;
                const hoursPurchased =
                  prepaid > 0
                    ? prepaid
                    : effectiveRate > 0
                    ? total / effectiveRate
                    : 0;
                const hoursRemaining = hoursPurchased - hoursCompleted;
                let remainColor = "#1877D6";
                if (hoursRemaining > 5) remainColor = "#1877D6";
                else if (hoursRemaining >= 1) remainColor = "#1877D6";
                const pct =
                  hoursPurchased > 0
                    ? Math.min(100, Math.max(0, (hoursCompleted / hoursPurchased) * 100))
                    : 0;
                return (
                  <>
                    <div
                      className="mt-3 pt-3 text-[11px] font-semibold uppercase tracking-wide"
                      style={{ color: "#6B7280", borderTop: "0.5px solid #EEF2F7", ...POPPINS }}
                    >
                      Hours
                    </div>
                    <NIRow label="Hours purchased" value={`${hoursPurchased.toFixed(1)} hrs`} />
                    <NIRow label="Hours completed" value={`${hoursCompleted.toFixed(1)} hrs`} />
                    <NIRow
                      label="Hours remaining"
                      value={`${hoursRemaining.toFixed(1)} hrs`}
                      valueColor={remainColor}
                    />
                    {total > 0 && prepaid > 0 && (
                      <NIRow
                        label="Rate per hour"
                        value={`£${(total / prepaid).toFixed(2)}/hr`}
                      />
                    )}
                    <div
                      style={{
                        marginTop: 10,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: "#F3F8FF",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          height: "100%",
                          backgroundColor: "#1877D6",
                          borderRadius: 4,
                        }}
                      />
                    </div>
                  </>
                );
              })()}


              <div
                className="mt-3 pt-3 text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: "#6B7280", borderTop: "0.5px solid #EEF2F7", ...POPPINS }}
              >
                Test details
              </div>
              <NIRow
                label="Test date"
                value={pupil.test_date ? new Date(`${pupil.test_date}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—"}
              />
              <NIRow label="Test time" value={pupil.test_time ? pupil.test_time.slice(0, 5) : "—"} />
              <div
                className="py-1.5"
                style={{ borderTop: "0.5px solid #F3F4F6" }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[12px]" style={{ color: "#6B7280", ...POPPINS }}>
                    Test centre
                  </span>
                  <div className="flex items-center gap-2">
                    {(centreInfo || pupil.test_centre) ? (
                      <span className="inline-flex items-center gap-1 text-[13px] font-medium" style={{ color: "#0B1F3A", ...POPPINS }}>
                        <MapPin size={14} color="#1877D6" />
                        {centreInfo
                          ? `${centreInfo.name}${centreInfo.town ? `, ${centreInfo.town}` : ""}`
                          : pupil.test_centre}
                      </span>
                    ) : (
                      <span className="text-[13px]" style={{ color: "#9CA3AF", ...POPPINS }}>—</span>
                    )}
                    <button
                      type="button"
                      onClick={async () => {
                        const next = !centrePickerOpen;
                        setCentrePickerOpen(next);
                        setCentreSearch("");
                        if (next && allCentres.length === 0) {
                          const { data } = await supabase
                            .from("test_centres")
                            .select("id, name, town")
                            .order("name", { ascending: true });
                          setAllCentres((data as any) ?? []);
                        }
                      }}
                      className="text-[12px] font-semibold"
                      style={{ color: "#1877D6", background: "none", border: "none", padding: 0, ...POPPINS }}
                    >
                      {centrePickerOpen ? "Cancel" : "Edit"}
                    </button>
                  </div>
                </div>
                {centrePickerOpen && (
                  <div className="mt-2" style={{ position: "relative" }}>
                    <div style={{ position: "relative" }}>
                      <Search
                        size={16}
                        color="#64748B"
                        style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}
                      />
                      <input
                        type="text"
                        placeholder="Search test centres..."
                        value={centreSearch}
                        onChange={(e) => setCentreSearch(e.target.value)}
                        style={{
                          width: "100%",
                          height: 36,
                          padding: "0 12px 0 36px",
                          borderRadius: 8,
                          border: "0.5px solid #E2E6ED",
                          fontSize: 13,
                          outline: "none",
                          ...POPPINS,
                        }}
                      />
                    </div>
                    <div
                      style={{
                        marginTop: 6,
                        border: "0.5px solid #E2E6ED",
                        borderRadius: 8,
                        maxHeight: 220,
                        overflowY: "auto",
                        backgroundColor: "#FFFFFF",
                      }}
                    >
                      <div
                        onClick={async () => {
                          const { error } = await supabase
                            .from("pupils")
                            .update({ test_centre_id: null })
                            .eq("id", pupil.id);
                          if (error) { toast.error("Failed to save — please try again"); return; }
                          setCentreInfo(null);
                          setPupil({ ...pupil, test_centre_id: null });
                          setCentrePickerOpen(false);
                          toast.success("Test centre cleared");
                        }}
                        className="cursor-pointer text-[13px]"
                        style={{ padding: "10px 12px", color: "#EF4444", borderBottom: "0.5px solid #F3F4F6", ...POPPINS }}
                      >
                        Clear test centre
                      </div>
                      {(() => {
                        const q = centreSearch.trim().toLowerCase();
                        const filtered = q
                          ? allCentres.filter(
                              (c) =>
                                (c.name || "").toLowerCase().includes(q) ||
                                (c.town || "").toLowerCase().includes(q),
                            )
                          : allCentres;
                        if (filtered.length === 0) {
                          return (
                            <div className="text-[13px]" style={{ padding: 12, color: "#6B7280", ...POPPINS }}>
                              No centres found
                            </div>
                          );
                        }
                        return filtered.map((c) => (
                          <div
                            key={c.id}
                            onClick={async () => {
                              const { error } = await supabase
                                .from("pupils")
                                .update({ test_centre_id: c.id, test_centre: c.name })
                                .eq("id", pupil.id);
                              if (error) { toast.error("Failed to save — please try again"); return; }
                              setCentreInfo(c);
                              setPupil({ ...pupil, test_centre_id: c.id, test_centre: c.name });
                              setCentrePickerOpen(false);
                              setCentreSearch("");
                              toast.success("Test centre updated");
                            }}
                            className="cursor-pointer"
                            style={{ padding: "10px 12px", borderBottom: "0.5px solid #F3F4F6" }}
                          >
                            <div className="text-[13px] font-semibold" style={{ color: "#0B1F3A", ...POPPINS }}>
                              {c.name}
                            </div>
                            {c.town ? (
                              <div className="text-[12px]" style={{ color: "#6B7280", ...POPPINS }}>
                                {c.town}
                              </div>
                            ) : null}
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}
              </div>

              <div
                className="mt-3 pt-3 text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: "#6B7280", borderTop: "0.5px solid #EEF2F7", ...POPPINS }}
              >
                EverySwap
              </div>
              <div
                className="flex items-center justify-between py-1.5"
                style={{ borderTop: "0.5px solid #F3F4F6" }}
              >
                <span className="text-[12px]" style={{ color: "#6B7280", ...POPPINS }}>
                  Swap status
                </span>
                {pupil.wants_swap ? (
                  <span className="flex items-center gap-2">
                    <span
                      className="text-[11px] font-semibold text-white px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: "#1877D6", ...POPPINS }}
                    >
                      On EverySwap list
                    </span>
                    <span className="text-[11px]" style={{ color: "#9CA3AF", ...POPPINS }}>
                      Seeking swap
                    </span>
                  </span>
                ) : (
                  <span className="text-[12px]" style={{ color: "#9CA3AF", ...POPPINS }}>
                    Not on swap list
                  </span>
                )}
              </div>

              <div className="mt-3 flex items-center gap-4">
                <button
                  type="button"
                  onClick={openEditSheet}
                  className="text-[13px] font-medium"
                  style={{ color: "#1877D6", ...POPPINS }}
                >
                  Edit payment details
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const next = !pupil.wants_swap;
                    const { error } = await supabase
                      .from("pupils")
                      .update({ wants_swap: next })
                      .eq("id", pupil.id);
                    if (error) { toast.error("Failed to save — please try again"); return; }
                    setPupil({ ...pupil, wants_swap: next });
                    toast.success(next ? "Added to EverySwap list" : "Removed from EverySwap list");
                  }}
                  className="text-[13px] font-medium"
                  style={{ color: "#1877D6", ...POPPINS }}
                >
                  Manage swap
                </button>
              </div>
            </div>
          );
        })()}

      {/* Custom lesson rates + calendar colour */}
      {pupil && (
        <PupilRatesAndColour
        pupil={pupil}
        instructorRate={instructorRate}
        onUpdated={(patch) => setPupil((p) => (p ? { ...p, ...patch } : p))}
        />
      )}
      <ConfirmDialog
        open={removeOpen}
        title={`Remove ${pupil?.name ?? "pupil"}?`}
        message={`${pupil?.name ?? "They"} will be marked inactive and hidden from all lists.`}
        confirmLabel="Remove"
        onConfirm={removePupil}
        onCancel={() => setRemoveOpen(false)}
      />

      {certOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCertOpen(false)} />
          <div
            className="relative w-full max-w-[430px] mx-auto bg-white rounded-t-2xl px-4 pt-5 pb-8"
            style={{ ...POPPINS, animation: "slideUp 0.25s ease-out" }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Award size={20} color="#1877D6" />
                <div className="text-[16px] font-semibold text-[#0B1F3A]">Generate certificate</div>
              </div>
              <button type="button" onClick={() => setCertOpen(false)} aria-label="Close">
                <X size={20} color="#6B7280" />
              </button>
            </div>

            <label className="block mb-1 text-[12px] font-medium text-[#6B7280]">Milestone</label>
            <select
              value={certMilestone}
              onChange={(e) => setCertMilestone(e.target.value as typeof certMilestone)}
              className="h-11 w-full rounded-lg px-3 text-[14px] text-[#0B1F3A] bg-white focus:border-[#1877D6] focus:outline-none mb-4"
              style={{ ...POPPINS, borderWidth: "0.5px", borderStyle: "solid", borderColor: "#EEF2F7" }}
            >
              <option value="first_lesson">First lesson complete</option>
              <option value="10_lessons">10 lessons complete</option>
              <option value="20_lessons">20 lessons complete</option>
              <option value="theory_pass">Theory test passed</option>
              <option value="test_pass">Driving test passed! 🎉</option>
            </select>

            <button
              type="button"
              onClick={() => {
                const milestoneTitles: Record<typeof certMilestone, string> = {
                  first_lesson: "First Lesson Complete",
                  "10_lessons": "10 Lessons Complete",
                  "20_lessons": "20 Lessons Complete",
                  theory_pass: "Theory Test Passed",
                  test_pass: "Driving Test Passed!",
                };
                const achievementText: Record<typeof certMilestone, string> = {
                  test_pass: "has successfully passed their practical driving test",
                  theory_pass: "has successfully passed their theory test",
                  first_lesson: "has completed their first driving lesson",
                  "10_lessons": "has completed 10 driving lessons",
                  "20_lessons": "has completed 20 driving lessons",
                };
                const pupilName = pupil?.name ?? "Pupil";
                const milestone = milestoneTitles[certMilestone];

                const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
                const W = 297;
                const H = 210;

                // Double border
                doc.setDrawColor(15, 32, 68);
                doc.setLineWidth(1.0);
                doc.rect(3, 3, W - 6, H - 6);
                doc.setLineWidth(0.3);
                doc.rect(7, 7, W - 14, H - 14);

                // Title
                doc.setTextColor(120, 120, 120);
                doc.setFont("helvetica", "normal");
                doc.setFontSize(14);
                doc.text("CERTIFICATE OF ACHIEVEMENT", W / 2, 40, { align: "center" });

                // Milestone heading
                doc.setTextColor(15, 32, 68);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(28);
                doc.text(milestone, W / 2, 60, { align: "center" });

                // "This is to certify that"
                doc.setTextColor(120, 120, 120);
                doc.setFont("helvetica", "normal");
                doc.setFontSize(12);
                doc.text("This is to certify that", W / 2, 78, { align: "center" });

                // Pupil name
                doc.setTextColor(30, 30, 30);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(24);
                doc.text(pupilName, W / 2, 92, { align: "center" });

                // Underline
                doc.setDrawColor(15, 32, 68);
                doc.setLineWidth(0.5);
                const nameWidth = doc.getTextWidth(pupilName);
                doc.line(W / 2 - nameWidth / 2 - 4, 96, W / 2 + nameWidth / 2 + 4, 96);

                // Achievement
                doc.setTextColor(120, 120, 120);
                doc.setFont("helvetica", "normal");
                doc.setFontSize(12);
                doc.text(achievementText[certMilestone], W / 2, 112, { align: "center" });

                // Date + Instructor
                const today = new Date();
                const dd = String(today.getDate()).padStart(2, "0");
                const mm = String(today.getMonth() + 1).padStart(2, "0");
                const yy = String(today.getFullYear()).slice(-2);
                doc.setFontSize(10);
                doc.setTextColor(60, 60, 60);
                doc.text(`Date: ${dd}/${mm}/${yy}`, 40, 132);
                doc.text(`Instructor: ${instructorName || "—"}`, W - 40, 132, { align: "right" });

                // Signature line
                doc.setDrawColor(150, 150, 150);
                doc.setLineWidth(0.3);
                doc.line(W / 2 - 40, 148, W / 2 + 40, 148);
                doc.setFontSize(9);
                doc.setTextColor(120, 120, 120);
                doc.text("Signature", W / 2, 154, { align: "center" });

                // Footer
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text("Issued by EveryDriver · everydriver.co.uk · DVSA Approved", W / 2, 165, {
                  align: "center",
                });

                doc.save(`${pupilName} - ${milestone} - Certificate.pdf`);
                setCertOpen(false);
                toast.success("Certificate downloaded. Send to pupil manually.");
              }}
              className="w-full inline-flex items-center justify-center gap-2 text-[14px] font-medium text-white"
              style={{ height: 44, borderRadius: 8, backgroundColor: "#1877D6", ...POPPINS }}
            >
              <Award size={16} color="#FFFFFF" />
              Generate & download
            </button>
          </div>
        </div>
      )}

      {editSheetOpen && pupil && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => !editSaving && setEditSheetOpen(false)} />
          <div
            className="relative w-full max-w-[430px] mx-auto bg-white rounded-t-2xl px-4 pt-5 pb-8 max-h-[90vh] overflow-y-auto"
            style={{ ...POPPINS, animation: "slideUp 0.25s ease-out" }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Pencil size={18} color="#1877D6" />
                <div className="text-[16px] font-semibold text-[#0B1F3A]">Edit pupil</div>
              </div>
              <button type="button" onClick={() => !editSaving && setEditSheetOpen(false)} aria-label="Close">
                <X size={20} color="#6B7280" />
              </button>
            </div>

            <div className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7280] mb-2">Record</div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <label className="text-[12px] text-[#6B7280]">
                First name
                <input
                  type="text"
                  value={editDraft.first_name}
                  onChange={(e) => setEditDraft((d) => ({ ...d, first_name: e.target.value }))}
                  className="mt-1 h-10 w-full rounded-lg px-3 text-[14px] text-[#0B1F3A] bg-white"
                  style={{ borderWidth: "0.5px", borderStyle: "solid", borderColor: "#EEF2F7" }}
                />
              </label>
              <label className="text-[12px] text-[#6B7280]">
                Last name
                <input
                  type="text"
                  value={editDraft.last_name}
                  onChange={(e) => setEditDraft((d) => ({ ...d, last_name: e.target.value }))}
                  className="mt-1 h-10 w-full rounded-lg px-3 text-[14px] text-[#0B1F3A] bg-white"
                  style={{ borderWidth: "0.5px", borderStyle: "solid", borderColor: "#EEF2F7" }}
                />
              </label>
            </div>
            <label className="block text-[12px] text-[#6B7280] mb-3">
              Phone
              <input
                type="tel"
                value={editDraft.phone}
                onChange={(e) => setEditDraft((d) => ({ ...d, phone: e.target.value }))}
                className="mt-1 h-10 w-full rounded-lg px-3 text-[14px] text-[#0B1F3A] bg-white"
                style={{ borderWidth: "0.5px", borderStyle: "solid", borderColor: "#EEF2F7" }}
              />
            </label>
            <label className="block text-[12px] text-[#6B7280] mb-4">
              Email
              <input
                type="email"
                value={editDraft.email}
                onChange={(e) => setEditDraft((d) => ({ ...d, email: e.target.value }))}
                className="mt-1 h-10 w-full rounded-lg px-3 text-[14px] text-[#0B1F3A] bg-white"
                style={{ borderWidth: "0.5px", borderStyle: "solid", borderColor: "#EEF2F7" }}
              />
            </label>

            <label className="text-[12px] text-[#6B7280] block mb-4">
              Status
              <select
                value={editDraft.status}
                onChange={(e) => setEditDraft((d) => ({ ...d, status: e.target.value }))}
                className="mt-1 h-10 w-full rounded-lg px-3 text-[14px] text-[#0B1F3A] bg-white"
                style={{ borderWidth: "0.5px", borderStyle: "solid", borderColor: "#EEF2F7" }}
              >
                <option value="active">Active</option>
                <option value="passed">Passed</option>
                <option value="inactive">Inactive</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>

            <div className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7280] mb-2">Payment details</div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <label className="text-[12px] text-[#6B7280]">
                Prepaid hours
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  value={editDraft.prepaid_hours}
                  onChange={(e) => setEditDraft((d) => ({ ...d, prepaid_hours: e.target.value }))}
                  className="mt-1 h-10 w-full rounded-lg px-3 text-[14px] text-[#0B1F3A] bg-white"
                  style={{ borderWidth: "0.5px", borderStyle: "solid", borderColor: "#EEF2F7" }}
                />
              </label>
              <label className="text-[12px] text-[#6B7280]">
                Prepaid amount paid (£)
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={editDraft.prepaid_amount_paid}
                  onChange={(e) => setEditDraft((d) => ({ ...d, prepaid_amount_paid: e.target.value }))}
                  className="mt-1 h-10 w-full rounded-lg px-3 text-[14px] text-[#0B1F3A] bg-white"
                  style={{ borderWidth: "0.5px", borderStyle: "solid", borderColor: "#EEF2F7" }}
                />
              </label>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-5">
              <label className="text-[12px] text-[#6B7280]">
                Rate 60m (£)
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  placeholder={instructorRate != null ? String(instructorRate) : "—"}
                  value={editDraft.custom_rate}
                  onChange={(e) => setEditDraft((d) => ({ ...d, custom_rate: e.target.value }))}
                  className="mt-1 h-10 w-full rounded-lg px-2 text-[14px] text-[#0B1F3A] bg-white"
                  style={{ borderWidth: "0.5px", borderStyle: "solid", borderColor: "#EEF2F7" }}
                />
              </label>
              <label className="text-[12px] text-[#6B7280]">
                Rate 90m (£)
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={editDraft.custom_rate_90}
                  onChange={(e) => setEditDraft((d) => ({ ...d, custom_rate_90: e.target.value }))}
                  className="mt-1 h-10 w-full rounded-lg px-2 text-[14px] text-[#0B1F3A] bg-white"
                  style={{ borderWidth: "0.5px", borderStyle: "solid", borderColor: "#EEF2F7" }}
                />
              </label>
              <label className="text-[12px] text-[#6B7280]">
                Rate 120m (£)
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={editDraft.custom_rate_120}
                  onChange={(e) => setEditDraft((d) => ({ ...d, custom_rate_120: e.target.value }))}
                  className="mt-1 h-10 w-full rounded-lg px-2 text-[14px] text-[#0B1F3A] bg-white"
                  style={{ borderWidth: "0.5px", borderStyle: "solid", borderColor: "#EEF2F7" }}
                />
              </label>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditSheetOpen(false)}
                disabled={editSaving}
                className="flex-1 h-11 rounded-lg text-[14px] font-medium text-[#0B1F3A] bg-white disabled:opacity-60"
                style={{ borderWidth: "0.5px", borderStyle: "solid", borderColor: "#EEF2F7" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEditSheet}
                disabled={editSaving}
                className="flex-1 h-11 rounded-lg text-[14px] font-semibold text-white bg-[#1877D6] disabled:opacity-60"
              >
                {editSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}


      <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
      </div>
    </div>
    </div>
  );
}

function StatChip({
  label,
  value,
  valueColor = "#0B1F3A",
  subValue,
  onClick,
}: {
  label: string;
  value: string;
  valueColor?: string;
  subValue?: string;
  onClick?: () => void;
}) {
  const Comp: any = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      type={onClick ? "button" : undefined}
      className="rounded-lg px-2 py-2 text-center w-full"
      style={{
        backgroundColor: "#F8F9FB",
        borderWidth: "0.5px",
        borderStyle: "solid",
        borderColor: "#EEF2F7",
        cursor: onClick ? "pointer" : undefined,
      }}
    >
      <div
        className="text-[14px] font-semibold truncate"
        style={{ color: valueColor, ...POPPINS }}
      >
        {value}
      </div>
      {subValue ? (
        <div
          className="text-[10px] truncate mt-0.5"
          style={{ color: "#0B1F3A", ...POPPINS }}
          title={subValue}
        >
          {subValue}
        </div>
      ) : null}
      <div
        className="text-[10px] font-medium uppercase mt-0.5"
        style={{ color: "#6B7280", letterSpacing: "0.05em", ...POPPINS }}
      >
        {label}
      </div>
    </Comp>
  );
}

function NIRow({
  label,
  value,
  valueColor = "#0B1F3A",
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div
      className="flex items-center justify-between py-1.5"
      style={{ borderTop: "0.5px solid #F3F4F6" }}
    >
      <span className="text-[12px]" style={{ color: "#6B7280", ...POPPINS }}>
        {label}
      </span>
      <span className="text-[13px] font-semibold" style={{ color: valueColor, ...POPPINS }}>
        {value}
      </span>
    </div>
  );
}

const RELATIONS = ["Parent", "Spouse", "Partner", "Sibling", "Friend", "Guardian", "Other"];
const CAL_COLOURS = ["#1A52A0", "#16A34A", "#CC2229", "#D97706", "#7C3AED", "#0891B2", "#EC4899", "#0F2044"];
const EXTRAS_CARD: React.CSSProperties = {
  borderRadius: 12,
  border: "0.5px solid #E2E6ED",
  padding: 16,
  marginTop: 12,
  background: "#fff",
};
const EXTRAS_INPUT: React.CSSProperties = {
  width: "100%",
  height: 40,
  padding: "0 12px",
  border: "0.5px solid #E2E6ED",
  borderRadius: 8,
  fontSize: 14,
  color: "#0B1F3A",
  background: "#fff",
  ...POPPINS,
};

function PupilExtras({
  pupil,
  instructorRate,
  instructorName,
  onUpdated,
}: {
  pupil: Pupil;
  instructorRate: number | null;
  instructorName: string;
  onUpdated: (patch: Partial<Pupil>) => void;
}) {
  const [editEmg, setEditEmg] = useState(false);
  const [emgName, setEmgName] = useState(pupil.emergency_contact_name ?? "");
  const [emgPhone, setEmgPhone] = useState(pupil.emergency_contact_phone ?? "");
  const [emgRel, setEmgRel] = useState(pupil.emergency_contact_relation ?? "Parent");
  const [savingEmg, setSavingEmg] = useState(false);

  const [editLic, setEditLic] = useState(false);
  const [licence, setLicence] = useState(pupil.driving_licence_number ?? "");
  const [savingLic, setSavingLic] = useState(false);
  const [savingChecked, setSavingChecked] = useState(false);
  const [requestSheetOpen, setRequestSheetOpen] = useState(false);

  async function patchPupil(patch: Record<string, unknown>) {
    const { data, error, status } = await supabase.from("pupils").update(patch).eq("id", pupil.id).select();
    console.log("[pupil-extras] patch result:", status, data, error);
    if (error) {
      console.error("[pupil] patch error", error);
      toast.error("Failed to save — please try again");
      return false;
    }
    return true;
  }

  async function saveEmg() {
    if (!emgName.trim() || !emgPhone.trim()) {
      toast.error("Name and phone required");
      return;
    }
    setSavingEmg(true);
    const ok = await patchPupil({
      emergency_contact_name: emgName.trim(),
      emergency_contact_phone: emgPhone.trim(),
      emergency_contact_relation: emgRel,
    });
    setSavingEmg(false);
    if (ok) {
      onUpdated({
        emergency_contact_name: emgName.trim(),
        emergency_contact_phone: emgPhone.trim(),
        emergency_contact_relation: emgRel,
      });
      setEditEmg(false);
      toast.success("Emergency contact saved");
    }
  }

  async function saveLic() {
    setSavingLic(true);
    const val = licence.trim() || null;
    const ok = await patchPupil({ driving_licence_number: val });
    setSavingLic(false);
    if (ok) {
      onUpdated({ driving_licence_number: val });
      setEditLic(false);
      toast.success("Driving licence saved");
    }
  }

  async function toggleLicenceChecked(next: boolean) {
    setSavingChecked(true);
    const ok = await patchPupil({ driving_licence_checked: next });
    setSavingChecked(false);
    if (ok) {
      onUpdated({ driving_licence_checked: next });
      toast.success(next ? "Licence marked as verified" : "Verification removed");
    }
  }

  const smsBody = `Hi ${pupil.name}, could you please share your DVLA licence check code with me? You can get it at https://www.gov.uk/view-driving-licence — tap 'Share your licence information' and send me the code. Thanks, ${instructorName || "your instructor"}`;
  const emailSubject = "DVLA Licence Check Code Request";
  const emailBody = `Hi ${pupil.name},\n\nAs part of your driving lessons, I need to verify your driving licence details.\n\nCould you please get your DVLA check code by visiting:\nhttps://www.gov.uk/view-driving-licence\n\nTap 'Share your licence information' and send me the 8-character code.\n\nMany thanks,\n${instructorName || "your instructor"}`;

  return (
    <>
      {/* Emergency contact */}
      <div style={EXTRAS_CARD}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Heart size={18} color="#CC2229" />
            <span className="text-[14px] font-semibold" style={{ color: "#0B1F3A", ...POPPINS }}>Emergency contact</span>
          </div>
          {!editEmg && (
            <button type="button" onClick={() => setEditEmg(true)} className="text-[12px] font-semibold" style={{ color: "#1877D6", ...POPPINS }}>
              {pupil.emergency_contact_name ? "Edit" : "Add"}
            </button>
          )}
        </div>
        {!editEmg ? (
          pupil.emergency_contact_name ? (
            <div>
              <div className="text-[14px] font-semibold" style={{ color: "#0B1F3A", ...POPPINS }}>{pupil.emergency_contact_name}</div>
              <div className="flex items-center gap-2 mt-1">
                <a href={`tel:${pupil.emergency_contact_phone ?? ""}`} className="text-[13px]" style={{ color: "#1877D6", ...POPPINS }}>
                  {pupil.emergency_contact_phone}
                </a>
                {pupil.emergency_contact_relation && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "#EEF2F7", color: "#0B1F3A", ...POPPINS }}>
                    {pupil.emergency_contact_relation}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="text-[13px]" style={{ color: "#6B7280", ...POPPINS }}>No emergency contact set</div>
          )
        ) : (
          <div className="flex flex-col gap-2">
            <input style={EXTRAS_INPUT} placeholder="Name" value={emgName} onChange={(e) => setEmgName(e.target.value)} />
            <input style={EXTRAS_INPUT} placeholder="Phone" type="tel" value={emgPhone} onChange={(e) => setEmgPhone(e.target.value)} />
            <select style={EXTRAS_INPUT} value={emgRel} onChange={(e) => setEmgRel(e.target.value)}>
              {RELATIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <div className="flex gap-2 mt-1">
              <button type="button" onClick={saveEmg} disabled={savingEmg} className="flex-1 h-10 rounded-lg text-white text-[13px] font-semibold" style={{ background: "#1877D6", ...POPPINS }}>
                {savingEmg ? "Saving…" : "Save"}
              </button>
              <button type="button" onClick={() => setEditEmg(false)} className="h-10 px-4 rounded-lg text-[13px] font-semibold" style={{ background: "#F3F4F6", color: "#0B1F3A", ...POPPINS }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Driving licence */}
      <div style={EXTRAS_CARD}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <CreditCard size={18} color="#1877D6" />
            <span className="text-[14px] font-semibold" style={{ color: "#0B1F3A", ...POPPINS }}>Driving licence</span>
          </div>
          {!editLic && (
            <button type="button" onClick={() => setEditLic(true)} className="text-[12px] font-semibold" style={{ color: "#1877D6", ...POPPINS }}>
              {pupil.driving_licence_number ? "Edit" : "Add"}
            </button>
          )}
        </div>
        {!editLic ? (
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="text-[14px] font-semibold tracking-wider" style={{ color: "#0B1F3A", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                {pupil.driving_licence_number ? pupil.driving_licence_number.toUpperCase().replace(/(.{5})(.{6})(.{5})/, "$1 $2 $3") : "Not set"}
              </div>
              {pupil.driving_licence_number && (
                pupil.driving_licence_checked ? (
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold" style={{ background: "#DCFCE7", color: "#166534", ...POPPINS }}>
                    Verified ✓
                  </span>
                ) : (
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold" style={{ background: "#FEF3C7", color: "#92400E", ...POPPINS }}>
                    Unverified
                  </span>
                )
              )}
            </div>
            <label className="flex items-center gap-2 mt-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={!!pupil.driving_licence_checked}
                onChange={(e) => toggleLicenceChecked(e.target.checked)}
                disabled={savingChecked}
                className="w-4 h-4"
                style={{ accentColor: "#1A52A0" }}
              />
              <span className="text-[13px]" style={{ color: "#0B1F3A", ...POPPINS }}>
                Licence checked and verified ✓
              </span>
            </label>
            <button
              type="button"
              onClick={() => setRequestSheetOpen(true)}
              className="mt-3 flex items-center gap-1.5 text-[13px] font-semibold"
              style={{ color: "#1A52A0", ...POPPINS }}
            >
              Request DVLA check code
              <ExternalLink size={14} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <input style={EXTRAS_INPUT} placeholder="e.g. MORGA657054SM9IJ" value={licence} onChange={(e) => setLicence(e.target.value.toUpperCase())} maxLength={20} />
            <div className="flex gap-2 mt-1">
              <button type="button" onClick={saveLic} disabled={savingLic} className="flex-1 h-10 rounded-lg text-white text-[13px] font-semibold" style={{ background: "#1877D6", ...POPPINS }}>
                {savingLic ? "Saving…" : "Save"}
              </button>
              <button type="button" onClick={() => setEditLic(false)} className="h-10 px-4 rounded-lg text-[13px] font-semibold" style={{ background: "#F3F4F6", color: "#0B1F3A", ...POPPINS }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
      {requestSheetOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(11,31,58,0.5)" }}
          onClick={() => setRequestSheetOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white"
            style={{ borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, paddingBottom: 32 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[15px] font-semibold" style={{ color: "#0B1F3A", ...POPPINS }}>
                Request DVLA check code
              </span>
              <button type="button" onClick={() => setRequestSheetOpen(false)} aria-label="Close">
                <X size={20} color="#0B1F3A" />
              </button>
            </div>
            <p className="text-[13px] mb-4" style={{ color: "#6B7280", ...POPPINS }}>
              How would you like to ask {pupil.name} for their check code?
            </p>
            <a
              href={pupil.phone ? `sms:${pupil.phone}?&body=${encodeURIComponent(smsBody)}` : `sms:?&body=${encodeURIComponent(smsBody)}`}
              onClick={() => setRequestSheetOpen(false)}
              className="flex items-center gap-3 w-full mb-2 rounded-lg"
              style={{ background: "#EEF4FB", padding: "14px 16px", color: "#0B1F3A", ...POPPINS }}
            >
              <MessageSquare size={18} color="#1A52A0" />
              <div className="flex-1">
                <div className="text-[14px] font-semibold">Send SMS</div>
                <div className="text-[12px]" style={{ color: "#6B7280" }}>
                  {pupil.phone ?? "No phone on file"}
                </div>
              </div>
            </a>
            <a
              href={pupil.email ? `mailto:${pupil.email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}` : `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`}
              onClick={() => setRequestSheetOpen(false)}
              className="flex items-center gap-3 w-full rounded-lg"
              style={{ background: "#EEF4FB", padding: "14px 16px", color: "#0B1F3A", ...POPPINS }}
            >
              <Mail size={18} color="#1A52A0" />
              <div className="flex-1">
                <div className="text-[14px] font-semibold">Send email</div>
                <div className="text-[12px]" style={{ color: "#6B7280" }}>
                  {pupil.email ?? "No email on file"}
                </div>
              </div>
            </a>
          </div>
        </div>
      )}
    </>
  );
}

function PupilRatesAndColour({
  pupil,
  instructorRate,
  onUpdated,
}: {
  pupil: Pupil;
  instructorRate: number | null;
  onUpdated: (patch: Partial<Pupil>) => void;
}) {
  const [r1, setR1] = useState(pupil.custom_rate != null ? String(pupil.custom_rate) : "");
  const [r90, setR90] = useState(pupil.custom_rate_90 != null ? String(pupil.custom_rate_90) : "");
  const [r120, setR120] = useState(pupil.custom_rate_120 != null ? String(pupil.custom_rate_120) : "");
  const [editRates, setEditRates] = useState(false);
  const [savingRates, setSavingRates] = useState(false);

  useEffect(() => {
    if (editRates) {
      setR1(pupil.custom_rate != null ? String(pupil.custom_rate) : "");
      setR90(pupil.custom_rate_90 != null ? String(pupil.custom_rate_90) : "");
      setR120(pupil.custom_rate_120 != null ? String(pupil.custom_rate_120) : "");
    }
  }, [editRates, pupil.custom_rate, pupil.custom_rate_90, pupil.custom_rate_120]);

  async function patchPupil(patch: Record<string, unknown>) {
    console.log("[custom-rates] patchPupil url:", `pupils?id=eq.${pupil.id}`, "payload:", patch);
    const { data, error, status } = await supabase.from("pupils").update(patch).eq("id", pupil.id).select();
    console.log("[custom-rates] result:", status, data, error);
    if (error) {
      console.error("[pupil] patch error", error);
      toast.error("Failed to save — please try again");
      return false;
    }
    return true;
  }

  async function saveRates() {
    setSavingRates(true);
    const patch = {
      custom_rate: r1 === "" ? null : Number(r1),
      custom_rate_90: r90 === "" ? null : Number(r90),
      custom_rate_120: r120 === "" ? null : Number(r120),
    };
    console.log("[custom-rates] saving:", patch);
    const ok = await patchPupil(patch);
    setSavingRates(false);
    if (ok) {
      onUpdated(patch);
      setR1(patch.custom_rate != null ? String(patch.custom_rate) : "");
      setR90(patch.custom_rate_90 != null ? String(patch.custom_rate_90) : "");
      setR120(patch.custom_rate_120 != null ? String(patch.custom_rate_120) : "");
      setEditRates(false);
      toast.success("Custom rates saved");
    }
  }

  async function clearRates() {
    setR1(""); setR90(""); setR120("");
    const patch = { custom_rate: null, custom_rate_90: null, custom_rate_120: null };
    const ok = await patchPupil(patch);
    if (ok) {
      onUpdated(patch);
      setEditRates(false);
      toast.success("Custom rates cleared");
    }
  }

  async function pickColour(hex: string) {
    const next = pupil.calendar_colour === hex ? null : hex;
    const ok = await patchPupil({ calendar_colour: next });
    if (ok) {
      onUpdated({ calendar_colour: next });
      toast.success("Colour updated");
    }
  }

  async function saveBuffer(raw: string) {
    const value = raw === "" ? null : Number(raw);
    const patch = { buffer_after_minutes: value };
    const ok = await patchPupil(patch);
    if (ok) {
      onUpdated(patch);
      toast.success("Buffer updated");
    }
  }

  return (
    <>
      {/* Custom rates */}
      <div style={EXTRAS_CARD}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <PoundSterling size={18} color="#1877D6" />
            <span className="text-[14px] font-semibold" style={{ color: "#0B1F3A", ...POPPINS }}>Custom lesson rates</span>
          </div>
          {!editRates && (
            <button type="button" onClick={() => setEditRates(true)} className="text-[12px] font-semibold" style={{ color: "#1877D6", ...POPPINS }}>
              {pupil.custom_rate != null || pupil.custom_rate_90 != null || pupil.custom_rate_120 != null ? "Edit" : "Add"}
            </button>
          )}
        </div>
        <div className="text-[12px] mb-3" style={{ color: "#6B7280", ...POPPINS }}>
          Default: {instructorRate != null ? `£${instructorRate}/hr` : "not set"}
        </div>
        {!editRates ? (
          pupil.custom_rate != null || pupil.custom_rate_90 != null || pupil.custom_rate_120 != null ? (
            <div className="flex flex-col gap-1">
              {pupil.custom_rate != null && (
                <div className="text-[13px]" style={{ color: "#0B1F3A", ...POPPINS }}>
                  1 hour: <span className="font-semibold">£{pupil.custom_rate}</span>
                </div>
              )}
              {pupil.custom_rate_90 != null && (
                <div className="text-[13px]" style={{ color: "#0B1F3A", ...POPPINS }}>
                  1.5 hour: <span className="font-semibold">£{pupil.custom_rate_90}</span>
                </div>
              )}
              {pupil.custom_rate_120 != null && (
                <div className="text-[13px]" style={{ color: "#0B1F3A", ...POPPINS }}>
                  2 hour: <span className="font-semibold">£{pupil.custom_rate_120}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-[13px]" style={{ color: "#6B7280", ...POPPINS }}>Using default instructor rate</div>
          )
        ) : (
          <div className="flex flex-col gap-2">
            <label className="text-[12px]" style={{ color: "#6B7280", ...POPPINS }}>1 hour lesson (£)</label>
            <input style={EXTRAS_INPUT} type="number" step="0.5" inputMode="decimal" placeholder={instructorRate != null ? String(instructorRate) : ""} value={r1} onChange={(e) => setR1(e.target.value)} />
            <label className="text-[12px] mt-1" style={{ color: "#6B7280", ...POPPINS }}>1.5 hour lesson (£)</label>
            <input style={EXTRAS_INPUT} type="number" step="0.5" inputMode="decimal" placeholder={instructorRate != null ? String(instructorRate * 1.5) : ""} value={r90} onChange={(e) => setR90(e.target.value)} />
            <label className="text-[12px] mt-1" style={{ color: "#6B7280", ...POPPINS }}>2 hour lesson (£)</label>
            <input style={EXTRAS_INPUT} type="number" step="0.5" inputMode="decimal" placeholder={instructorRate != null ? String(instructorRate * 2) : ""} value={r120} onChange={(e) => setR120(e.target.value)} />
            <div className="flex gap-2 mt-3">
              <button type="button" onClick={saveRates} disabled={savingRates} className="flex-1 h-10 rounded-lg text-white text-[13px] font-semibold" style={{ background: "#1877D6", ...POPPINS }}>
                {savingRates ? "Saving…" : "Save rates"}
              </button>
              <button type="button" onClick={() => setEditRates(false)} className="h-10 px-4 rounded-lg text-[13px] font-semibold" style={{ background: "#F3F4F6", color: "#0B1F3A", ...POPPINS }}>
                Cancel
              </button>
            </div>
            <button type="button" onClick={clearRates} className="mt-2 text-[12px] font-medium text-left" style={{ color: "#CC2229", ...POPPINS }}>
              Clear custom rates
            </button>
          </div>
        )}
        {/* Gap after lesson */}
        <div className="flex justify-between items-center" style={{ marginTop: 12, paddingTop: 10, borderTop: "0.5px solid #F3F4F6" }}>
          <div className="flex items-center">
            <Clock size={14} color="#9CA3AF" />
            <span className="text-sm ml-[6px] text-[#0F2044]" style={POPPINS}>Gap after lesson</span>
          </div>
          <select
            value={pupil.buffer_after_minutes ?? ""}
            onChange={(e) => void saveBuffer(e.target.value)}
            className="text-[13px]"
            style={{ height: 34, borderRadius: 8, border: "0.5px solid #E2E6ED", padding: "0 8px", backgroundColor: "#fff", color: "#0F2044", ...POPPINS }}
          >
            <option value="">Use default</option>
            {[0, 5, 10, 15, 20, 30, 45, 60].map((m) => (
              <option key={m} value={m}>{m} min</option>
            ))}
          </select>
        </div>
      </div>

      {/* Calendar colour */}
      <div style={EXTRAS_CARD}>
        <div className="flex items-center gap-2 mb-3">
          <Palette size={18} color="#1877D6" />
          <span className="text-[14px] font-semibold" style={{ color: "#0B1F3A", ...POPPINS }}>Calendar colour</span>
        </div>
        <div className="grid grid-cols-8 gap-2">
          {CAL_COLOURS.map((c) => {
            const selected = pupil.calendar_colour === c;
            return (
              <button
                key={c}
                type="button"
                aria-label={`Colour ${c}`}
                onClick={() => pickColour(c)}
                className="flex items-center justify-center rounded-full"
                style={{ width: 32, height: 32, background: c, border: selected ? "2px solid #0B1F3A" : "0.5px solid #E2E6ED" }}
              >
                {selected && <Check size={16} color="#fff" />}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

function AddressEditor({
  initialAddress,
  initialPostcode,
  inputRef,
  onSave,
}: {
  initialAddress: string;
  initialPostcode: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onSave: (address: string, postcode: string) => void | Promise<void>;
}) {
  const [addr, setAddr] = useState(initialAddress);
  const [pc, setPc] = useState(initialPostcode);
  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="text"
        placeholder="Start typing address..."
        value={addr}
        onChange={(e) => setAddr(e.target.value)}
        autoComplete="off"
        style={{
          width: "100%",
          height: 40,
          padding: "0 12px",
          borderRadius: 8,
          border: "0.5px solid #E2E6ED",
          fontSize: 14,
          outline: "none",
          ...POPPINS,
        }}
      />
      <input
        type="text"
        placeholder="Postcode"
        value={pc}
        onChange={(e) => setPc(e.target.value)}
        style={{
          width: "100%",
          height: 40,
          padding: "0 12px",
          borderRadius: 8,
          border: "0.5px solid #E2E6ED",
          fontSize: 14,
          outline: "none",
          ...POPPINS,
        }}
      />
      <div className="flex justify-end">
        <Button variant="primary" onClick={() => onSave(addr, pc)}>Save</Button>
      </div>
    </div>
  );
}

const PUPIL_LEAD_SOURCES = [
  "Referral",
  "EveryDriver",
  "National Intensive",
  "Online",
  "Walk-in / Local",
  "Social media",
  "Driving school",
  "Returning pupil",
  "Other",
];

function LeadSourceSection({
  pupil,
  onSave,
}: {
  pupil: Pupil;
  onSave: (patch: Record<string, unknown>) => void | Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [source, setSource] = useState<string>(pupil.lead_source ?? "");
  const [detail, setDetail] = useState<string>(pupil.lead_source_detail ?? "");
  const inputStyle: React.CSSProperties = {
    width: "100%", height: 40, padding: "0 12px", borderRadius: 8,
    border: "0.5px solid #E2E6ED", fontSize: 14, outline: "none", ...POPPINS,
  };
  return (
    <>
      <div className="mx-4 mt-4 mb-1 flex items-center justify-between">
        <SectionHeader>LEAD SOURCE</SectionHeader>
        {!editing && (
          <button
            type="button"
            onClick={() => {
              setSource(pupil.lead_source ?? "");
              setDetail(pupil.lead_source_detail ?? "");
              setEditing(true);
            }}
            className="text-[12px] font-semibold flex items-center gap-1"
            style={{ color: "#1877D6", background: "none", border: "none", padding: 0, ...POPPINS }}
          >
            <Pencil size={12} /> Edit
          </button>
        )}
      </div>
      <div
        className="mx-4 rounded-lg bg-white px-3 py-2 text-[14px] text-[#0B1F3A]"
        style={{
          ...POPPINS,
          borderWidth: "0.5px",
          borderStyle: "solid",
          borderColor: "#EEF2F7",
        }}
      >
        {editing ? (
          <div className="flex flex-col gap-2">
            <select value={source} onChange={(e) => setSource(e.target.value)} style={inputStyle}>
              <option value="">Select…</option>
              {PUPIL_LEAD_SOURCES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Detail (e.g. who referred them)"
              value={detail}
              onChange={(e) => setDetail(e.target.value.slice(0, 255))}
              style={inputStyle}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
              <Button
                variant="primary"
                onClick={async () => {
                  await onSave({
                    lead_source: source || null,
                    lead_source_detail: detail.trim() || null,
                  });
                  setEditing(false);
                }}
              >
                Save
              </Button>
            </div>
          </div>
        ) : pupil.lead_source ? (
          <>
            {pupil.lead_source}
            {pupil.lead_source_detail ? ` — ${pupil.lead_source_detail}` : ""}
          </>
        ) : (
          <span style={{ color: "#9CA3AF" }}>Not set</span>
        )}
      </div>
    </>
  );
}

function TheoryEditor({
  pupil,
  onSave,
}: {
  pupil: Pupil;
  onSave: (patch: Record<string, unknown>) => void | Promise<void>;
}) {
  const [status, setStatus] = useState<string>(pupil.theory_status || "Not started");
  const [testDate, setTestDate] = useState<string>(pupil.theory_test_date || "");
  const [passDate, setPassDate] = useState<string>(pupil.theory_pass_date || "");
  const [score, setScore] = useState<string>(
    typeof pupil.theory_score === "number" ? String(pupil.theory_score) : "",
  );
  const showDate = ["Booked", "Passed", "Failed"].includes(status);
  const showPassDate = status === "Passed";
  const showScore = status === "Passed" || status === "Failed";
  const inputStyle: React.CSSProperties = {
    width: "100%", height: 40, padding: "0 12px", borderRadius: 8,
    border: "0.5px solid #E2E6ED", fontSize: 14, outline: "none", ...POPPINS,
  };
  return (
    <div className="flex flex-col gap-2">
      <select value={status} onChange={(e) => setStatus(e.target.value)} style={inputStyle}>
        {THEORY_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      {showDate && (
        <label className="text-[12px]" style={{ color: "#6B7280", ...POPPINS }}>
          Test date
          <input type="date" value={testDate} onChange={(e) => setTestDate(e.target.value)} style={{ ...inputStyle, marginTop: 4 }} />
        </label>
      )}
      {showPassDate && (
        <label className="text-[12px]" style={{ color: "#6B7280", ...POPPINS }}>
          Pass date
          <input type="date" value={passDate} onChange={(e) => setPassDate(e.target.value)} style={{ ...inputStyle, marginTop: 4 }} />
        </label>
      )}
      {showScore && (
        <label className="text-[12px]" style={{ color: "#6B7280", ...POPPINS }}>
          Score
          <input type="number" value={score} onChange={(e) => setScore(e.target.value)} style={{ ...inputStyle, marginTop: 4 }} />
        </label>
      )}
      <div className="flex justify-end">
        <Button
          variant="primary"
          onClick={() => onSave({
            theory_status: status,
            theory_test_date: showDate && testDate ? testDate : null,
            theory_pass_date: showPassDate && passDate ? passDate : null,
            theory_score: showScore && score !== "" ? Number(score) : null,
          })}
        >
          Save
        </Button>
      </div>
    </div>
  );
}

function PracticalEditor({
  pupil,
  centreInfo,
  allCentres,
  pickerOpen,
  setPickerOpen,
  search,
  setSearch,
  onCentreSelect,
  onSave,
}: {
  pupil: Pupil;
  centreInfo: { id: string; name: string; town: string | null } | null;
  allCentres: { id: string; name: string; town: string | null }[];
  pickerOpen: boolean;
  setPickerOpen: (v: boolean) => void;
  search: string;
  setSearch: (v: string) => void;
  onCentreSelect: (c: { id: string; name: string; town: string | null } | null) => void;
  onSave: (patch: Record<string, unknown>) => void | Promise<void>;
}) {
  const [status, setStatus] = useState<string>(pupil.test_status || "Not booked");
  const [testDate, setTestDate] = useState<string>(pupil.test_date || "");
  const [testTime, setTestTime] = useState<string>(pupil.test_time ? pupil.test_time.slice(0, 5) : "");
  const [centreId, setCentreId] = useState<string | null>(pupil.test_centre_id);
  const [centreLabel, setCentreLabel] = useState<string>(
    centreInfo ? `${centreInfo.name}${centreInfo.town ? `, ${centreInfo.town}` : ""}` : (pupil.test_centre ?? ""),
  );
  const [examiner, setExaminer] = useState<string>(pupil.test_examiner ?? "");
  const inputStyle: React.CSSProperties = {
    width: "100%", height: 40, padding: "0 12px", borderRadius: 8,
    border: "0.5px solid #E2E6ED", fontSize: 14, outline: "none", ...POPPINS,
  };
  const filtered = search.trim()
    ? allCentres.filter((c) => {
        const q = search.trim().toLowerCase();
        return (c.name || "").toLowerCase().includes(q) || (c.town || "").toLowerCase().includes(q);
      })
    : allCentres;
  return (
    <div className="flex flex-col gap-2">
      <select value={status} onChange={(e) => setStatus(e.target.value)} style={inputStyle}>
        {PRACTICAL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <label className="text-[12px]" style={{ color: "#6B7280", ...POPPINS }}>
        Test date
        <input type="date" value={testDate} onChange={(e) => setTestDate(e.target.value)} style={{ ...inputStyle, marginTop: 4 }} />
      </label>
      <label className="text-[12px]" style={{ color: "#6B7280", ...POPPINS }}>
        Test time
        <input type="time" value={testTime} onChange={(e) => setTestTime(e.target.value)} style={{ ...inputStyle, marginTop: 4 }} />
      </label>
      <div>
        <div className="text-[12px]" style={{ color: "#6B7280", ...POPPINS }}>Test centre</div>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 text-[13px]" style={{ color: centreLabel ? "#0B1F3A" : "#9CA3AF", ...POPPINS }}>
            {centreLabel || "None selected"}
          </div>
          <button
            type="button"
            onClick={() => setPickerOpen(!pickerOpen)}
            className="text-[12px] font-semibold"
            style={{ color: "#1877D6", background: "none", border: "none", padding: 0, ...POPPINS }}
          >
            {pickerOpen ? "Close" : "Choose"}
          </button>
        </div>
        {pickerOpen && (
          <div className="mt-2">
            <div style={{ position: "relative" }}>
              <Search size={16} color="#64748B" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
              <input
                type="text"
                placeholder="Search test centres..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ ...inputStyle, height: 36, padding: "0 12px 0 36px", fontSize: 13 }}
              />
            </div>
            <div style={{ marginTop: 6, border: "0.5px solid #E2E6ED", borderRadius: 8, maxHeight: 220, overflowY: "auto", backgroundColor: "#FFFFFF" }}>
              <div
                onClick={() => {
                  setCentreId(null);
                  setCentreLabel("");
                  onCentreSelect(null);
                  setPickerOpen(false);
                }}
                className="cursor-pointer text-[13px]"
                style={{ padding: "10px 12px", color: "#EF4444", borderBottom: "0.5px solid #F3F4F6", ...POPPINS }}
              >
                Clear test centre
              </div>
              {filtered.length === 0 ? (
                <div className="text-[13px]" style={{ padding: 12, color: "#6B7280", ...POPPINS }}>No centres found</div>
              ) : (
                filtered.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      setCentreId(c.id);
                      setCentreLabel(`${c.name}${c.town ? `, ${c.town}` : ""}`);
                      onCentreSelect(c);
                      setPickerOpen(false);
                      setSearch("");
                    }}
                    className="cursor-pointer"
                    style={{ padding: "10px 12px", borderBottom: "0.5px solid #F3F4F6" }}
                  >
                    <div className="text-[13px] font-semibold" style={{ color: "#0B1F3A", ...POPPINS }}>{c.name}</div>
                    {c.town && <div className="text-[12px]" style={{ color: "#6B7280", ...POPPINS }}>{c.town}</div>}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      <label className="text-[12px]" style={{ color: "#6B7280", ...POPPINS }}>
        Examiner name (optional)
        <input type="text" value={examiner} onChange={(e) => setExaminer(e.target.value)} style={{ ...inputStyle, marginTop: 4 }} />
      </label>
      <div className="flex justify-end">
        <Button
          variant="primary"
          onClick={async () => {
            const patch: Record<string, unknown> = {
              test_status: status,
              test_date: testDate || null,
              test_time: testTime ? `${testTime}:00` : null,
              test_centre_id: centreId,
              test_centre: centreLabel ? centreLabel.split(",")[0].trim() : null,
              test_examiner: examiner.trim() || null,
            };
            await onSave(patch);
          }}
        >
          Save
        </Button>
      </div>
    </div>
  );
}
