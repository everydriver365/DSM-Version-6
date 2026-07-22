import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import {
  ArrowLeft,
  Plus,
  X,
  Send,
  Flag,
  ThumbsUp,
  MapPin,
  AlertTriangle,
  Car,
  Building2 as Building,
  Clock,
  Info,
  GraduationCap,
  MessageSquare,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/community")({
  head: () => ({
    meta: [
      { title: "Community — DSM" },
      { name: "description", content: "Local alerts and chat for ADIs in your area." },
    ],
  }),
  component: CommunityPage,
});

type Alert = {
  id: string;
  instructor_id: string;
  alert_type: string;
  description: string;
  location_name: string | null;
  area: string | null;
  outcode: string | null;
  upvotes: number;
  upvoted_by: string[] | null;
  is_active: boolean;
  expires_at: string;
  created_at: string;
  instructors?: { name: string | null } | null;
};

type ChatRoom = { id: string; area_name: string; outcode: string; instructor_count?: number };
type ChatMessage = {
  id: string;
  room_id: string;
  instructor_id: string;
  message: string;
  created_at: string;
  is_flagged: boolean | null;
  flagged_by: string[] | null;
  deleted_at: string | null;
  instructors: { name: string | null; profile_image_url: string | null } | null;
};

const TYPE_CONFIG: Record<string, { label: string; bg: string; colour: string; Icon: any }> = {
  roadworks:         { label: "Roadworks",     bg: "#FEF3C7", colour: "#D97706", Icon: Car },
  road_closure:      { label: "Road closure",  bg: "#FEF3C7", colour: "#D97706", Icon: AlertTriangle },
  heavy_traffic:     { label: "Heavy traffic", bg: "#FEF3C7", colour: "#D97706", Icon: Car },
  hazard:            { label: "Hazard",        bg: "#FCEBEB", colour: "#A32D2D", Icon: AlertTriangle },
  test_centre_busy:  { label: "TC busy",       bg: "#FCEBEB", colour: "#A32D2D", Icon: Building },
  test_centre_delay: { label: "TC delay",      bg: "#FCEBEB", colour: "#A32D2D", Icon: Clock },
  examiner_tip:      { label: "Examiner tip",  bg: "#F5F3FF", colour: "#6B4FD6", Icon: GraduationCap },
  other:             { label: "Other",         bg: "#F3F4F6", colour: "#6B7280", Icon: Info },
};

const TYPE_ORDER = [
  "roadworks", "road_closure",
  "heavy_traffic", "hazard",
  "test_centre_busy", "test_centre_delay",
  "examiner_tip", "other",
];

function minutesUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date();
  midnight.setHours(23, 59, 59, 0);
  return Math.max(1, Math.floor((midnight.getTime() - now.getTime()) / 60000));
}

function formatCountdown(expires: string): string {
  const diff = new Date(expires).getTime() - Date.now();
  if (diff <= 0) return "expired";
  const totalMins = Math.floor(diff / 60000);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h > 0) return `expires in ${h}h ${m}m`;
  return `expires in ${m}m`;
}

function firstName(name: string | null | undefined): string {
  if (!name) return "Someone";
  return name.trim().split(/\s+/)[0] || "Someone";
}

const reverseGeocodeLocation = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ lat: z.number(), lng: z.number() }).parse(data)
  )
  .handler(async ({ data }): Promise<{ location: string | null; lat: number; lng: number }> => {
    const googleKey = process.env.GOOGLE_API_KEY;
    if (!googleKey) {
      console.warn("[community] GOOGLE_API_KEY not set");
      return { location: null, lat: data.lat, lng: data.lng };
    }
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${data.lat},${data.lng}&key=${googleKey}&result_type=route|street_address`
      );
      if (!res.ok) {
        console.warn("[community] geocode response not ok:", res.status);
        return { location: null, lat: data.lat, lng: data.lng };
      }
      const json: any = await res.json();
      const result = json?.results?.[0];
      if (!result) return { location: null, lat: data.lat, lng: data.lng };
      const components = result.address_components ?? [];
      const road = components.find((c: any) => c.types.includes("route"))?.long_name;
      const town = components.find(
        (c: any) => c.types.includes("postal_town") || c.types.includes("locality")
      )?.long_name;
      const locationStr = [road, town].filter(Boolean).join(", ") || result.formatted_address;
      return { location: locationStr, lat: data.lat, lng: data.lng };
    } catch (err) {
      console.warn("[community] reverse geocode failed:", err);
      return { location: null, lat: data.lat, lng: data.lng };
    }
  });

function CommunityPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"alerts" | "local" | "uk">("alerts");
  const [userId, setUserId] = useState<string | null>(null);
  const [instructorFirstName, setInstructorFirstNameState] = useState<string>("");
  const [instructorArea, setInstructorArea] = useState<string>("Your area");
  const [instructorOutcode, setInstructorOutcode] = useState<string | null>(null);
  const [instructorProfile, setInstructorProfile] = useState<{ name: string | null; profile_image_url: string | null } | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      if (!u) return;
      setUserId(u.id);
      const { data: instructor } = await supabase
        .from("instructors")
        .select("name, profile_image_url, home_postcode, city")
        .eq("id", u.id)
        .maybeSingle();
      const outcode = (instructor as any)?.home_postcode?.substring(0, 4)?.trim()?.toUpperCase() ?? null;
      const area = (instructor as any)?.city || outcode || "Your area";
      console.log("[community] instructor fetch:", { area, outcode, instructor });
      setInstructorArea(area);
      setInstructorOutcode(outcode);
      setInstructorFirstNameState(firstName((instructor as any)?.name));
      setInstructorProfile({
        name: (instructor as any)?.name ?? null,
        profile_image_url: (instructor as any)?.profile_image_url ?? null,
      });
    })();
  }, []);

  return (
    <div style={{ background: "#F7FAFC", minHeight: "100vh", paddingBottom: 80, fontFamily: "Inter, sans-serif" }}>
      {/* TOP BAR */}
      <div style={{
        background: "#0F2044", padding: "16px", display: "flex",
        alignItems: "center", justifyContent: "space-between", color: "white",
      }}>
        <button
          type="button"
          onClick={() => navigate({ to: "/home" as never })}
          aria-label="Back"
          style={{ background: "none", border: "none", color: "white", cursor: "pointer", display: "flex" }}
        >
          <ArrowLeft size={22} />
        </button>
        <div style={{ fontWeight: 700, fontSize: 18 }}>Community</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{" "}</div>
      </div>

      {/* TABS */}
      <div style={{
        background: "white", borderBottom: "0.5px solid #E2E6ED",
        display: "flex", position: "sticky", top: 0, zIndex: 10,
      }}>
        {([
          { id: "alerts", label: "Local Alerts" },
          { id: "local", label: "Local Chat" },
          { id: "uk", label: "All UK" },
        ] as const).map((t) => {
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              style={{
                flex: 1, padding: "12px", textAlign: "center", fontSize: 13,
                fontWeight: 600, background: "none", border: "none", cursor: "pointer",
                borderBottom: active ? "2px solid #185FA5" : "2px solid transparent",
                color: active ? "#185FA5" : "#8A93A3",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {activeTab === "alerts" && (
        <AlertsTab
          userId={userId}
          instructorFirstName={instructorFirstName}
          instructorArea={instructorArea}
          instructorOutcode={instructorOutcode}
        />
      )}
      {activeTab === "local" && (
        <ChatTab
          key="local"
          scope="local"
          userId={userId}
          instructorProfile={instructorProfile}
          instructorArea={instructorArea}
          instructorOutcode={instructorOutcode}
        />
      )}
      {activeTab === "uk" && (
        <ChatTab
          key="uk"
          scope="uk"
          userId={userId}
          instructorProfile={instructorProfile}
          instructorArea="All UK"
          instructorOutcode="UK"
        />
      )}
    </div>
  );
}

/* ============================================================ ALERTS TAB */

function AlertsTab({
  userId, instructorFirstName, instructorArea, instructorOutcode,
}: {
  userId: string | null;
  instructorFirstName: string;
  instructorArea: string;
  instructorOutcode: string | null;
}) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [reportSheetOpen, setReportSheetOpen] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("local_alerts")
      .select("*, instructors(name)")
      .eq("is_active", true)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });
    const rows = (data ?? []) as Alert[];
    const filtered = instructorOutcode
      ? rows.filter((a) => (a.outcode ?? "").toUpperCase() === instructorOutcode)
      : rows;
    setAlerts(filtered);
  };

  useEffect(() => {
    if (!userId) return;
    load();
    const channel = supabase
      .channel(`local_alerts:${instructorOutcode ?? "all"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "local_alerts" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, instructorOutcode]);

  const myAlerts = useMemo(
    () => alerts.filter((a) => a.instructor_id === userId),
    [alerts, userId],
  );
  const otherAlerts = useMemo(
    () => alerts.filter((a) => a.instructor_id !== userId),
    [alerts, userId],
  );

  const handleUpvote = async (alert: Alert) => {
    if (!userId) return;
    const already = (alert.upvoted_by ?? []).includes(userId);
    if (already) {
      toast.info("You already confirmed this");
      return;
    }
    const newUpvotedBy = [...(alert.upvoted_by ?? []), userId];
    const newUpvotes = alert.upvotes + 1;
    const newExpires = new Date(new Date(alert.expires_at).getTime() + 30 * 60000).toISOString();
    setAlerts((prev) => prev.map((a) => a.id === alert.id
      ? { ...a, upvotes: newUpvotes, upvoted_by: newUpvotedBy, expires_at: newExpires }
      : a));
    const { error } = await supabase.rpc("upvote_local_alert", { p_alert_id: alert.id });
    if (error) {
      toast.error("Couldn't confirm — try again");
      load();
    }
  };

  const handleCancel = async (alert: Alert) => {
    const { error } = await supabase
      .from("local_alerts")
      .update({ is_active: false, expires_at: new Date().toISOString() })
      .eq("id", alert.id);
    if (error) {
      toast.error("Couldn't cancel");
      return;
    }
    toast.success("Alert cancelled");
    load();
  };

  return (
    <div style={{ padding: 16, paddingBottom: 100, marginBottom: 80 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#0F2044" }}>
          Alerts near {instructorArea}
        </div>
        <div style={{ fontSize: 12, color: "#9CA3AF" }}>{otherAlerts.length} active</div>
      </div>

      {otherAlerts.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center" }}>
          <MapPin size={48} color="#D1D5DB" style={{ margin: "0 auto 12px" }} />
          <div style={{ fontWeight: 600, color: "#6B7280" }}>No alerts near {instructorArea}</div>
          <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>Be the first to report an issue</div>
          <button
            type="button"
            onClick={() => {
              console.log("[community] FAB tapped (empty state)");
              setReportSheetOpen(true);
            }}
            style={{
              background: "#CC2229", color: "white", border: "none", borderRadius: 12,
              padding: "10px 24px", marginTop: 16, fontWeight: 600, cursor: "pointer",
            }}
          >

            Report alert
          </button>
        </div>
      ) : (
        otherAlerts.map((a) => (
          <AlertCard key={a.id} alert={a} userId={userId} onUpvote={handleUpvote} />
        ))
      )}

      {myAlerts.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 600, marginBottom: 8 }}>
            Your active alerts
          </div>
          {myAlerts.map((a) => {
            const cfg = TYPE_CONFIG[a.alert_type] ?? TYPE_CONFIG.other;
            return (
              <div key={a.id} style={{
                background: cfg.bg,
                borderLeft: `3px solid ${cfg.colour}`,
                borderRadius: 12,
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                padding: "14px 16px",
                marginBottom: 8,
                position: "relative",
              }}>
                <div style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  background: "#0F2044",
                  color: "white",
                  fontSize: 9,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 999,
                  textTransform: "uppercase",
                  letterSpacing: 0.3,
                }}>
                  Your alert
                </div>
                <div style={{ paddingRight: 80 }}>
                  <div style={{
                    fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                    color: cfg.colour, letterSpacing: 0.3,
                  }}>
                    {cfg.label}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#0F2044" }}>
                    {a.description}
                  </div>
                  <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>
                    {formatCountdown(a.expires_at)}
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                  <button
                    type="button"
                    onClick={() => handleCancel(a)}
                    style={{
                      background: "#FEF2F2", color: "#CC2229", border: "0.5px solid #FECACA",
                      borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* REPORT FAB */}
      <button
        type="button"
        onClick={() => {
          console.log("[community] FAB tapped");
          console.log("[community] agreed:", typeof window !== "undefined" ? localStorage.getItem("community_agreed") : "n/a");
          console.log("[community] instructor area:", instructorArea, instructorOutcode);
          console.log("[community] userId:", userId);
          setReportSheetOpen(true);
        }}
        aria-label="Report local issue"
        style={{
          position: "fixed",
          bottom: "calc(80px + env(safe-area-inset-bottom, 0px) + 12px)",
          right: 16, background: "#CC2229", border: "none", borderRadius: "50%",
          width: 56, height: 56, display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", boxShadow: "0 4px 12px rgba(204,34,41,0.4)", zIndex: 50, color: "white",
        }}
      >
        <Plus size={24} />
      </button>

      {reportSheetOpen && (
        <ReportSheet
          reportSheetOpen={reportSheetOpen}
          onClose={() => setReportSheetOpen(false)}
          onSubmitted={() => { setReportSheetOpen(false); load(); }}
          userId={userId}
          instructorFirstName={instructorFirstName}
          instructorArea={instructorArea}
          instructorOutcode={instructorOutcode}
        />
      )}
    </div>
  );
}

function AlertCard({
  alert, userId, onUpvote,
}: {
  alert: Alert; userId: string | null; onUpvote: (a: Alert) => void;
}) {
  const cfg = TYPE_CONFIG[alert.alert_type] ?? TYPE_CONFIG.other;
  const Icon = cfg.Icon;
  const alreadyUpvoted = !!userId && (alert.upvoted_by ?? []).includes(userId);
  const reporter = firstName(alert.instructors?.name);

  return (
    <div style={{
      background: "white", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      padding: "14px 16px", marginBottom: 8,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8, background: cfg.bg,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Icon size={14} color={cfg.colour} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 10, fontWeight: 700, textTransform: "uppercase",
            color: cfg.colour, letterSpacing: 0.3,
          }}>
            {cfg.label}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#0F2044", marginTop: 2 }}>
            {alert.description}
          </div>
          {alert.location_name && (
            <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 1 }}>{alert.location_name}</div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: "#9CA3AF" }}>{formatCountdown(alert.expires_at)}</div>
          <div style={{ fontSize: 10, color: "#9CA3AF" }}>{reporter}</div>
        </div>
      </div>

      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginTop: 10, paddingTop: 8, borderTop: "0.5px solid #F3F4F6",
      }}>
        <div style={{ fontSize: 12, color: "#9CA3AF" }}>{reporter} reported this</div>
        <button
          type="button"
          onClick={() => onUpvote(alert)}
          style={{
            display: "flex", alignItems: "center", gap: 4,
            background: "#F7FAFC", border: "0.5px solid #E2E6ED", borderRadius: 8,
            padding: "6px 12px", cursor: "pointer",
          }}
        >
          <ThumbsUp
            size={13}
            color={alreadyUpvoted ? "#185FA5" : "#9CA3AF"}
            fill={alreadyUpvoted ? "#185FA5" : "none"}
          />
          <span style={{ fontSize: 12, fontWeight: 600, color: alreadyUpvoted ? "#185FA5" : "#6B7280" }}>
            {alert.upvotes} confirmed
          </span>
        </button>
      </div>
    </div>
  );
}

/* ============================================================ REPORT SHEET */

function ReportSheet({
  reportSheetOpen, onClose, onSubmitted, userId, instructorFirstName, instructorArea, instructorOutcode,
}: {
  reportSheetOpen: boolean;
  onClose: () => void;
  onSubmitted: () => void;
  userId: string | null;
  instructorFirstName: string;
  instructorArea: string;
  instructorOutcode: string | null;
}) {
  const [agreed, setAgreed] = useState<boolean>(() => {
    try { return typeof window !== "undefined" && localStorage.getItem("community_agreed") === "true"; } catch { return false; }
  });
  const [selectedType, setSelectedType] = useState<string>("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [expiry, setExpiry] = useState<"30min" | "1hour" | "2hours" | "allday">("1hour");
  const [submitting, setSubmitting] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [reportLat, setReportLat] = useState<number | null>(null);
  const [reportLng, setReportLng] = useState<number | null>(null);

  useEffect(() => {
    setIsAnonymous(selectedType === "examiner_tip");
  }, [selectedType]);

  useEffect(() => {
    console.log("[community] ReportSheet mounted; agreed:", agreed);
    console.log("[community] report sheet open:", reportSheetOpen);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!reportSheetOpen) return;
    if (!navigator.geolocation) {
      setLocationLoading(false);
      return;
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setReportLat(latitude);
        setReportLng(longitude);
        try {
          const result = await reverseGeocodeLocation({ data: { lat: latitude, lng: longitude } });
          if (result.location) {
            setLocation(result.location);
          }
        } catch (err) {
          console.warn("[community] reverse geocode failed:", err);
        } finally {
          setLocationLoading(false);
        }
      },
      (error) => {
        console.warn("[community] geolocation error:", error);
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }, [reportSheetOpen]);

  const canSubmit = !!selectedType && description.trim().length > 0 && !!userId && !!instructorOutcode && !submitting;

  const submit = async () => {
    console.log("[community] report sheet open:", reportSheetOpen);
    console.log("[community] selected type:", selectedType);
    console.log("[community] description:", description);
    console.log("[community] instructor area:", instructorArea, instructorOutcode);
    console.log("[community] canSubmit:", canSubmit, "userId:", userId);
    if (!canSubmit || !userId) {
      console.warn("[community] submit blocked: canSubmit/userId falsy");
      return;
    }
    setSubmitting(true);
    const expiryMinutes = expiry === "30min" ? 30
      : expiry === "1hour" ? 60
      : expiry === "2hours" ? 120
      : minutesUntilMidnight();
    const payload = {
      instructor_id: userId,
      alert_type: selectedType,
      description: description.trim(),
      location_name: location.trim() || null,
      area: instructorArea,
      outcode: instructorOutcode,
      lat: reportLat,
      lng: reportLng,
      upvotes: 0,
      upvoted_by: [],
      is_active: true,
      expires_at: new Date(Date.now() + expiryMinutes * 60000).toISOString(),
    };
    console.log("[community] submit payload:", payload);
    const { data, error } = await supabase.from("local_alerts").insert(payload).select();
    console.log("[community] insert result:", data, error);
    setSubmitting(false);
    if (error) {
      console.error("[community] insert error:", error);
      toast.error("Failed to report: " + error.message);
      return;
    }
    toast.success("Alert reported — thanks for helping local ADIs!");
    onSubmitted();
  };


  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(15,32,68,0.4)", zIndex: 60,
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white", borderRadius: "20px 20px 0 0",
          maxHeight: "90vh", overflowY: "auto", width: "100%", maxWidth: 560,
        }}
      >
        <div style={{ width: 36, height: 4, background: "#E5E7EB", borderRadius: 999, margin: "12px auto 4px" }} />

        {!agreed ? (
          <div style={{ padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12, color: "#0F2044" }}>Community guidelines</div>
            <ul style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.6, paddingLeft: 18, margin: 0 }}>
              <li>Keep it relevant — driving related only</li>
              <li>Be professional and respectful to other ADIs</li>
              <li>No advertising or self-promotion</li>
              <li>Examiner tips: keep anonymous, no full names</li>
              <li>DSM moderates all content</li>
            </ul>
            <button
              type="button"
              onClick={() => {
                try { localStorage.setItem("community_agreed", "true"); } catch {}
                setAgreed(true);
              }}
              style={{
                background: "#0F2044", color: "white", border: "none", borderRadius: 12,
                width: "100%", padding: 12, marginTop: 16, fontWeight: 600, cursor: "pointer",
              }}
            >
              I agree — report my alert
            </button>
          </div>
        ) : (
          <>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "12px 20px",
            }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#0F2044" }}>Report a local issue</div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                style={{
                  width: 32, height: 32, borderRadius: "50%", background: "#F3F4F6",
                  border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                }}
              >
                <X size={16} color="#6B7280" />
              </button>
            </div>

            <div style={{
              display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8,
              padding: "0 20px", marginBottom: 16,
            }}>
              {TYPE_ORDER.map((key) => {
                const cfg = TYPE_CONFIG[key];
                const Icon = cfg.Icon;
                const selected = selectedType === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedType(key)}
                    style={{
                      background: selected ? cfg.bg : "#F7FAFC",
                      border: `0.5px solid ${selected ? cfg.colour : "#E2E6ED"}`,
                      borderRadius: 10, padding: "14px 12px", cursor: "pointer",
                      minHeight: 72, display: "flex", flexDirection: "column",
                      alignItems: "center", justifyContent: "center", gap: 6,
                    }}
                  >
                    <Icon size={20} color={cfg.colour} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: selected ? cfg.colour : "#0F2044" }}>
                      {cfg.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <div style={{ padding: "0 20px", marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 600, marginBottom: 6 }}>Where?</div>
              <div style={{ position: "relative" }}>
                <MapPin size={16} color="#9CA3AF" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={locationLoading ? "Detecting your location..." : "Road name or location..."}
                  disabled={locationLoading}
                  style={{
                    width: "100%",
                    padding: "11px 36px 11px 34px",
                    background: "#F7FAFC",
                    border: "0.5px solid " + (location ? "#86EFAC" : "#E2E6ED"),
                    borderRadius: 10,
                    fontSize: 13,
                    fontFamily: "Inter, sans-serif",
                    color: "#0F2044",
                    outline: "none",
                    boxSizing: "border-box",
                    opacity: locationLoading ? 0.7 : 1,
                  }}
                />
                {location && !locationLoading && (
                  <button
                    type="button"
                    onClick={() => setLocation("")}
                    style={{
                      position: "absolute", right: 10, top: "50%",
                      transform: "translateY(-50%)",
                      background: "none", border: "none",
                      cursor: "pointer", color: "#9CA3AF",
                      fontSize: 16, lineHeight: 1, padding: 4,
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
              {locationLoading && (
                <div style={{ fontSize: 12, color: "#185FA5", marginTop: 6 }}>
                  Getting your location...
                </div>
              )}
              {location && !locationLoading && (
                <div style={{ fontSize: 12, color: "#22C580", marginTop: 6 }}>
                  Location detected — edit if needed
                </div>
              )}
            </div>

            <div style={{ padding: "0 20px", marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 600, marginBottom: 6 }}>Details</div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add details to help other ADIs..."
                style={{
                  width: "100%", minHeight: 80, background: "#F7FAFC",
                  border: "0.5px solid #E2E6ED", borderRadius: 10, padding: "11px 14px",
                  fontSize: 14, outline: "none", boxSizing: "border-box", resize: "vertical",
                  fontFamily: "inherit",
                }}
              />
            </div>

            <div style={{ padding: "0 20px", marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 14, color: "#0F2044" }}>Report anonymously</div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isAnonymous}
                  onClick={() => setIsAnonymous((v) => !v)}
                  style={{
                    width: 40, height: 24, borderRadius: 999, border: "none", cursor: "pointer",
                    background: isAnonymous ? "#0F2044" : "#E5E7EB", position: "relative",
                    transition: "background 0.15s",
                  }}
                >
                  <span style={{
                    position: "absolute", top: 2, left: isAnonymous ? 18 : 2,
                    width: 20, height: 20, borderRadius: "50%", background: "white",
                    transition: "left 0.15s", boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                  }} />
                </button>
              </div>
              <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>
                Your name won't be shown to other instructors
              </div>
            </div>

            <div style={{ padding: "0 20px", marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 600, marginBottom: 8 }}>
                How long is this relevant?
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {([
                  { id: "30min", label: "30 mins" },
                  { id: "1hour", label: "1 hour" },
                  { id: "2hours", label: "2 hours" },
                  { id: "allday", label: "All day" },
                ] as const).map((opt) => {
                  const active = expiry === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setExpiry(opt.id)}
                      style={{
                        flex: 1, borderRadius: 999, padding: "8px 10px", cursor: "pointer",
                        fontSize: 12, fontWeight: 600,
                        background: active ? "#0F2044" : "#F7FAFC",
                        color: active ? "white" : "#6B7280",
                        border: active ? "0.5px solid #0F2044" : "0.5px solid #E2E6ED",
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ padding: "0 20px 20px" }}>
              <button
                type="button"
                onClick={submit}
                disabled={!canSubmit}
                style={{
                  background: canSubmit ? "#CC2229" : "#F3F4F6",
                  color: canSubmit ? "white" : "#9CA3AF",
                  border: "none", borderRadius: 12, width: "100%", padding: 12,
                  fontWeight: 600, cursor: canSubmit ? "pointer" : "not-allowed",
                }}
              >
                {submitting ? "Posting…" : "Report alert"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ============================================================ CHAT TAB */

function ChatTab({
  scope, userId, instructorProfile, instructorArea, instructorOutcode,
}: {
  scope: "local" | "uk";
  userId: string | null;
  instructorProfile: { name: string | null; profile_image_url: string | null } | null;
  instructorArea: string;
  instructorOutcode: string | null;
}) {
  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [noRoom, setNoRoom] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      const el = listRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  };

  useEffect(() => {
    if (!userId) return;
    if (scope === "local" && !instructorOutcode) return;
    let cancelled = false;
    (async () => {
      const outcode = scope === "uk" ? "UK" : instructorOutcode!;
      const areaName = scope === "uk" ? "All UK ADIs" : instructorArea;

      const { data: roomRow } = await supabase
        .from("local_chat_rooms")
        .select("*")
        .eq("outcode", outcode)
        .maybeSingle();
      if (cancelled) return;
      if (!roomRow) {
        setNoRoom(true);
        setRoom(null);
        return;
      }
      setNoRoom(false);
      setRoom(roomRow as ChatRoom);

      const { data: msgs } = await supabase
        .from("local_chat_messages")
        .select("*, instructors(name, profile_image_url)")
        .eq("room_id", (roomRow as any).id)
        .is("deleted_at", null)
        .order("created_at", { ascending: true })
        .limit(100);
      if (cancelled) return;
      setMessages((msgs ?? []) as ChatMessage[]);
      scrollToBottom();
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, scope, instructorOutcode]);

  useEffect(() => {
    if (!room) return;
    const channel = supabase
      .channel(`local_chat:${room.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "local_chat_messages", filter: `room_id=eq.${room.id}` },
        async (payload) => {
          const inserted = payload.new as ChatMessage;
          const { data: withInstructor } = await supabase
            .from("local_chat_messages")
            .select("*, instructors(name, profile_image_url)")
            .eq("id", inserted.id)
            .maybeSingle();
          setMessages((prev) => [...prev, (withInstructor ?? inserted) as ChatMessage]);
          scrollToBottom();
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [room]);

  const send = async () => {
    if (!room || !userId) return;
    const msg = newMessage.trim();
    if (!msg) return;
    setNewMessage("");
    const { error } = await supabase.from("local_chat_messages").insert({
      room_id: room.id,
      instructor_id: userId,
      message: msg,
    });
    if (error) toast.error("Couldn't send");
  };

  const flag = async (msg: ChatMessage) => {
    const flaggedBy = Array.from(new Set([...(msg.flagged_by ?? []), userId ?? ""])).filter(Boolean);
    const { error } = await supabase
      .from("local_chat_messages")
      .update({ is_flagged: true, flagged_by: flaggedBy })
      .eq("id", msg.id);
    if (!error) toast.info("Message flagged for review by DSM");
  };

  const areaLabel = scope === "uk" ? "All UK" : (room?.area_name ?? instructorArea);
  const memberCount = room?.instructor_count ?? 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 130px)" }}>
      <div style={{
        background: "white", borderBottom: "0.5px solid #E2E6ED",
        padding: "12px 16px", position: "sticky", top: 45, zIndex: 5,
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#0F2044" }}>
          {scope === "uk" ? "All UK ADIs" : `${areaLabel} ADIs`}
        </div>
        <div style={{ fontSize: 12, color: "#9CA3AF" }}>
          {memberCount} members · {scope === "uk" ? "Chat with ADIs across the UK" : "Real names only"}
        </div>
      </div>

      <div
        ref={listRef}
        style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column" }}
      >
        {noRoom ? (
          <div style={{ marginTop: 60, textAlign: "center", padding: "0 24px" }}>
            <MessageSquare size={40} color="#D1D5DB" style={{ margin: "0 auto 12px" }} />
            <div style={{ fontWeight: 600, color: "#6B7280" }}>
              No chat room yet for your area
            </div>
            <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4, lineHeight: 1.5 }}>
              Check back soon, or contact support.
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div style={{ marginTop: 40, textAlign: "center" }}>
            <div style={{ fontWeight: 600, color: "#6B7280" }}>Be the first to chat in {areaLabel}!</div>
            <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>
              Connect with local ADIs, share tips and help each other
            </div>
          </div>
        ) : (
          messages.map((m, idx) => {
            const prev = messages[idx - 1];
            const showDateSep = !prev || new Date(prev.created_at).toDateString() !== new Date(m.created_at).toDateString();
            const isMine = m.instructor_id === userId;
            const time = new Date(m.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
            return (
              <div key={m.id}>
                {showDateSep && (
                  <div style={{ fontSize: 12, color: "#9CA3AF", textAlign: "center", padding: "8px 0" }}>
                    {new Date(m.created_at).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" })}
                  </div>
                )}
                {isMine ? (
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
                    <div style={{ maxWidth: "75%" }}>
                      <div style={{
                        background: "#0F2044", color: "white",
                        borderRadius: "16px 16px 4px 16px", padding: "10px 14px",
                        fontSize: 13, whiteSpace: "pre-wrap", wordBreak: "break-word",
                      }}>
                        {m.message}
                      </div>
                      <div style={{ fontSize: 10, color: "#9CA3AF", textAlign: "right", marginTop: 2 }}>{time}</div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", justifyContent: "flex-start", gap: 8, marginBottom: 8 }}>
                    <ChatAvatar
                      name={m.instructors?.name ?? "Anon"}
                      photo={m.instructors?.profile_image_url ?? null}
                      size={32}
                    />
                    <div style={{ maxWidth: "75%" }}>
                      <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 600, marginBottom: 2 }}>
                        {firstName(m.instructors?.name)}
                      </div>
                      <div style={{
                        background: "white", border: "0.5px solid #E2E6ED",
                        borderRadius: "4px 16px 16px 16px", padding: "10px 14px",
                        fontSize: 13, color: "#0F2044", whiteSpace: "pre-wrap", wordBreak: "break-word",
                      }}>
                        {m.message}
                      </div>
                      <div style={{ display: "flex", gap: 8, marginTop: 2, alignItems: "center" }}>
                        <span style={{ fontSize: 10, color: "#9CA3AF" }}>{time}</span>
                        <button
                          type="button"
                          onClick={() => flag(m)}
                          aria-label="Flag message"
                          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}
                        >
                          <Flag size={11} color="#D1D5DB" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div style={{
        background: "white", borderTop: "0.5px solid #E2E6ED",
        padding: "12px 16px",
        paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
        display: "flex", alignItems: "center", gap: 8, position: "sticky", bottom: 0,
      }}>
        <ChatAvatar
          name={instructorProfile?.name ?? "You"}
          photo={instructorProfile?.profile_image_url ?? null}
          size={28}
        />
        <input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          disabled={noRoom || !room}
          placeholder={noRoom ? "No room available yet" : `Message ${areaLabel} ADIs...`}
          style={{
            flex: 1, background: "#F7FAFC", border: "0.5px solid #E2E6ED",
            borderRadius: 20, padding: "10px 14px", fontSize: 13, outline: "none",
            opacity: noRoom || !room ? 0.6 : 1,
          }}
        />
        <button
          type="button"
          onClick={send}
          disabled={noRoom || !newMessage.trim() || !room}
          aria-label="Send"
          style={{
            width: 36, height: 36, borderRadius: "50%", border: "none",
            background: !noRoom && newMessage.trim() && room ? "#0F2044" : "#E5E7EB",
            color: "white", display: "flex", alignItems: "center", justifyContent: "center",
            cursor: !noRoom && newMessage.trim() && room ? "pointer" : "not-allowed", flexShrink: 0,
          }}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

function ChatAvatar({ name, photo, size }: { name: string; photo: string | null; size: number }) {
  const initials = (name || "?")
    .trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? "").join("");
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: "#1A52A0",
      color: "white", display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: Math.round(size * 0.38), fontWeight: 700, flexShrink: 0,
      backgroundImage: photo ? `url(${photo})` : undefined,
      backgroundSize: "cover", backgroundPosition: "center",
    }}>
      {!photo && initials}
    </div>
  );
}
