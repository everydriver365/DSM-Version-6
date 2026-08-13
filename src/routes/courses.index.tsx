import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, GraduationCap, ChevronRight, MapPin } from "lucide-react";
import { toast } from "sonner";
import InstructorTopBar from "@/components/dsm/InstructorTopBar";
import { PupilAvatar } from "@/components/PupilAvatar";
import { supabase } from "../lib/supabaseClient";


export const Route = createFileRoute("/courses/")({
  head: () => ({
    meta: [
      { title: "My courses — DSM by EveryDriver" },
      { name: "description", content: "Manage your intensive and weekly driving courses." },
    ],
  }),
  component: CoursesPage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

interface CourseRow {
  id: string;
  course_type: string;
  name: string;
  price: number;
  start_date: string | null;
  status: string;
  total_hours: number | null;
  max_spaces: number;
  spaces_taken: number;
  pickup_area: string | null;
  transmission: string | null;
  pickup_postcodes: { postcode: string; lat: number | null; lng: number | null }[] | null;
  image_url: string | null;
}

interface BookingRow {
  id: string;
  course_id: string | null;
  pupil_name: string | null;
  status: string | null;
  amount_paid: number | null;
}

function SectionBar({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        margin: "18px 0 10px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 3, height: 14, borderRadius: 2, background: color }} />
        <span
          style={{
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: "0.6px",
            textTransform: "uppercase",
            color,
          }}
        >
          {label}
        </span>
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: "#8A8A8E" }}>{count}</span>
    </div>
  );
}




function typeColor(t: string) {
  if (t === "intensive") return "#1877D6";
  if (t === "semi-intensive") return "#1877D6";
  if (t === "weekly") return "#1877D6";
  return "#1877D6";
}
function typeLabel(t: string) {
  if (t === "intensive") return "Intensive";
  if (t === "semi-intensive") return "Semi-intensive";
  if (t === "weekly") return "Weekly";
  return "Custom";
}
function statusColor(s: string) {
  if (s === "active") return "#1877D6";
  if (s === "draft") return "#1877D6";
  if (s === "full") return "#1877D6";
  return "#6B7280";
}
function formatDate(d: string | null) {
  if (!d) return "No start date";
  return new Date(d + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function CoursesPage() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Record<string, BookingRow[]>>({});


  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) {
        setLoading(false);
        return;
      }
      const query = supabase
        .from("instructor_courses")
        .select("id, course_type, name, price, start_date, status, total_hours, max_spaces, spaces_taken, pickup_area, pickup_postcodes, image_url, transmission")
        .eq("instructor_id", uid)
        .order("created_at", { ascending: false });

      let { data, error } = await query;

      if (error) {
        console.error("[courses] query error:", error.code, error.message);
      }
      console.log("[courses] data count:", data?.length ?? 0);

      if (error?.code === "42703" && error.message.includes("transmission")) {
        const fallback = await supabase
          .from("instructor_courses")
          .select("id, course_type, name, price, start_date, status, total_hours, max_spaces, spaces_taken, pickup_area, pickup_postcodes, image_url")
          .eq("instructor_id", uid)
          .order("created_at", { ascending: false });
        data = fallback.data?.map((row) => ({ ...row, transmission: null })) ?? null;
        error = fallback.error;
        if (error) {
          console.error("[courses] fallback (transmission) query error:", error.code, error.message);
        }
        console.log("[courses] fallback (transmission) data count:", data?.length ?? 0);
      }

      if (error?.code === "42703" && error.message.includes("pickup_postcodes")) {
        const fallback = await supabase
          .from("instructor_courses")
          .select("id, course_type, name, price, start_date, status, total_hours, max_spaces, spaces_taken, pickup_area, image_url")
          .eq("instructor_id", uid)
          .order("created_at", { ascending: false });
        data = fallback.data?.map((row) => ({ ...row, pickup_postcodes: null, transmission: null })) ?? null;
        error = fallback.error;
        if (error) {
          console.error("[courses] fallback (pickup_postcodes) query error:", error.code, error.message);
        }
        console.log("[courses] fallback (pickup_postcodes) data count:", data?.length ?? 0);
      }

      if (error?.code === "42703" && error.message.includes("image_url")) {
        const fallback = await supabase
          .from("instructor_courses")
          .select("id, course_type, name, price, start_date, status, total_hours, max_spaces, spaces_taken, pickup_area")
          .eq("instructor_id", uid)
          .order("created_at", { ascending: false });
        data = fallback.data?.map((row) => ({ ...row, pickup_postcodes: null, image_url: null, transmission: null })) ?? null;
        error = fallback.error;
        if (error) {
          console.error("[courses] fallback (image_url) query error:", error.code, error.message);
        }
        console.log("[courses] fallback (image_url) data count:", data?.length ?? 0);
      }

      if (error) console.error("[courses] fetch error", error);

      const rows = (data ?? []) as CourseRow[];
      setCourses(rows);
      setLoading(false);

      if (rows.length > 0) {
        const { data: bk } = await supabase
          .from("course_bookings")
          .select("id, course_id, pupil_name, status, amount_paid")
          .eq("instructor_id", uid)
          .in("course_id", rows.map((r) => r.id));
        const map: Record<string, BookingRow[]> = {};
        for (const b of (bk ?? []) as BookingRow[]) {
          if (!b.course_id) continue;
          if (b.status === "cancelled") continue;
          (map[b.course_id] ??= []).push(b);
        }
        setBookings(map);
      }
    })();
  }, []);

  const spacesLeftOf = (c: CourseRow) => Math.max(0, (c.max_spaces ?? 0) - (c.spaces_taken ?? 0));
  const available = courses.filter((c) => spacesLeftOf(c) > 0);
  const soldOut = courses.filter((c) => spacesLeftOf(c) === 0);


  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F3F8FF", ...POPPINS }}>
      <InstructorTopBar
        firstName=""
        pageTitle="My courses"
        onBack={() => navigate({ to: "/home" as never })}
        onBell={() => navigate({ to: "/notifications" as never })}
        onPhone={() => navigate({ to: "/enquiries" as never })}
        onLiveTrack={() => navigate({ to: "/live" as never })}
        onMenu={() => navigate({ to: "/more" as never })}
        onMicPress={() => toast.info("Voice commands coming soon!")}
      />
      <div style={{ height: "calc(60px + env(safe-area-inset-top, 0px))" }} />

      {/* Action bar */}
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "8px 16px" }}>
        <button
          onClick={() => navigate({ to: "/courses/new" })}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#1877D6", display: "flex", alignItems: "center", gap: 8, fontSize: 14.5, fontWeight: 600, fontFamily: "Poppins, sans-serif", padding: 0 }}
          aria-label="New course"
        >
          <span style={{ width: 22, height: 22, borderRadius: "50%", background: "#1877D6", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <Plus size={14} color="#fff" strokeWidth={3} />
          </span>
          New course
        </button>
      </div>

      <div style={{ padding: "0 16px 24px" }}>

        {loading ? (
          <div style={{ color: "#6B7280", padding: 16 }}>Loading…</div>
        ) : courses.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "48px 16px",
              color: "#6B7280",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
            }}
          >
            <GraduationCap size={48} color="#9CA3AF" />
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              No courses yet — create your first course
            </div>
            <button
              onClick={() => navigate({ to: "/courses/new" })}
              style={{
                marginTop: 8,
                background: "#1877D6",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "10px 16px",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
                fontFamily: "Poppins, sans-serif",
              }}
            >
              + New course
            </button>
          </div>
        ) : (
          <>
            {available.length > 0 && (
              <>
                <SectionBar label="Available" count={available.length} color="#1877D6" />
                {available.map((c) => (
                  <CourseCard
                    key={c.id}
                    course={c}
                    bookings={bookings[c.id] ?? []}
                    soldOut={false}
                    navigate={navigate}
                  />
                ))}
              </>
            )}
            {soldOut.length > 0 && (
              <>
                <SectionBar label="Sold out" count={soldOut.length} color="#8A8A8E" />
                {soldOut.map((c) => (
                  <CourseCard
                    key={c.id}
                    course={c}
                    bookings={bookings[c.id] ?? []}
                    soldOut
                    navigate={navigate}
                  />
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function CourseCard({
  course: c,
  bookings,
  soldOut,
  navigate,
}: {
  course: CourseRow;
  bookings: BookingRow[];
  soldOut: boolean;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const spacesLeft = Math.max(0, (c.max_spaces ?? 0) - (c.spaces_taken ?? 0));
  const draft = c.status === "draft";
  function outwardCode(postcode: string) {
    return postcode.trim().toUpperCase().split(' ')[0];
  }
  const locations = c.pickup_area
    ? [outwardCode(c.pickup_area)]
    : (c.pickup_postcodes ?? [])
        .map((p) => outwardCode(p.postcode))
        .filter(Boolean)
        .filter((v, i, arr) => arr.indexOf(v) === i);

  const locationText =
    locations.length > 1 ? `${locations.length} locations` : locations[0] ?? formatDate(c.start_date);
  const hours = c.total_hours == null ? "?" : String(Number(c.total_hours));
  const goToCourse = () => navigate({ to: "/courses/$id", params: { id: c.id } });
  const booker = bookings[0];
  const paid = (booker?.amount_paid ?? 0) > 0;

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 20,
        padding: 12,
        marginBottom: 14,
        boxShadow: "0 4px 0 #E4E4E8, 0 12px 26px rgba(0,0,0,0.06)",
      }}
    >
      {/* Photo */}
      <div
        role="button"
        tabIndex={0}
        onClick={goToCourse}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            goToCourse();
          }
        }}
        style={{
          borderRadius: 14,
          overflow: "hidden",
          height: 150,
          position: "relative",
          cursor: "pointer",
          background: "linear-gradient(150deg, #0B1F3A, #14509E)",
        }}
      >
        {c.image_url ? (
          <img
            src={c.image_url}
            alt={c.name ?? ""}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <GraduationCap size={54} color="rgba(255,255,255,0.15)" />
          </div>
        )}

        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg, transparent 50%, rgba(11,31,58,0.85) 100%)",
          }}
        />

        {/* Top badges */}
        <div
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            right: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                background: "rgba(255,255,255,0.2)",
                backdropFilter: "blur(4px)",
                WebkitBackdropFilter: "blur(4px)",
                color: "#fff",
                fontSize: 10,
                fontWeight: 800,
                padding: "5px 10px",
                borderRadius: 20,
                textTransform: "uppercase",
                letterSpacing: "0.4px",
              }}
            >
              {typeLabel(c.course_type)}
            </span>
            {c.transmission && (
              <div style={{
                background: c.transmission === 'Automatic' ? '#E0F2FE' : c.transmission === 'Both' ? '#F0FDF4' : '#F1F5F9',
                color: c.transmission === 'Automatic' ? '#0369A1' : c.transmission === 'Both' ? '#15803D' : '#475569',
                fontSize: 10,
                fontWeight: 700,
                borderRadius: 20,
                padding: '2px 8px',
                fontFamily: 'Poppins, sans-serif',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                {c.transmission}
              </div>
            )}
          </div>
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: soldOut ? "#8A8A8E" : "#FF3B30",
              color: "#fff",
              fontSize: 11,
              fontWeight: 900,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {hours}
          </span>
        </div>

        {/* Bottom text */}
        <div style={{ position: "absolute", left: 12, right: 12, bottom: 10 }}>
          <div
            style={{
              color: "#fff",
              fontSize: 17,
              fontWeight: 800,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {c.name}
          </div>
          <div
            style={{
              marginTop: 2,
              display: "flex",
              alignItems: "center",
              gap: 4,
              color: "rgba(255,255,255,0.7)",
              fontSize: 11,
            }}
          >
            <MapPin size={10} color="rgba(255,255,255,0.7)" />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {locationText}
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          padding: "12px 4px 4px",
        }}
      >
        <div style={{ color: "#0B1F3A", fontSize: 19, fontWeight: 900 }}>
          £{Number(c.price).toFixed(0)}
        </div>
        <div style={{ textAlign: "right" }}>
          <span
            style={{
              display: "inline-block",
              background: soldOut ? "#F2F2F7" : "#E6F7EC",
              color: soldOut ? "#6B6B6F" : "#248A3D",
              fontSize: 10.5,
              fontWeight: 800,
              padding: "4px 11px",
              borderRadius: 20,
            }}
          >
            {soldOut ? "Sold out" : draft ? "Draft" : "Active"}
          </span>
          <div
            style={{
              marginTop: 4,
              fontSize: 11.5,
              fontWeight: soldOut ? 600 : 700,
              color: soldOut ? "#B0B0B5" : "#FF3B30",
            }}
          >
            {spacesLeft} {spacesLeft === 1 ? "space" : "spaces"} left
          </div>
        </div>
      </div>

      {/* Booked by */}
      {booker && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate({ to: "/bookings", search: { selected: booker.id } as never })}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              navigate({ to: "/bookings", search: { selected: booker.id } as never });
            }
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            paddingTop: 12,
            borderTop: "1px solid #F0F0F2",
            marginTop: 2,
            cursor: "pointer",
          }}
        >
          <PupilAvatar pupil={{ id: booker.id, name: booker.pupil_name }} size={32} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                color: "#8A8A8E",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.3px",
                textTransform: "uppercase",
              }}
            >
              Booked by
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
              <span
                style={{
                  color: "#0B1F3A",
                  fontSize: 13.5,
                  fontWeight: 800,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {booker.pupil_name ?? "Pupil"}
              </span>
              <span
                style={{
                  background: paid ? "#E6F7EC" : "#FDEDEC",
                  color: paid ? "#248A3D" : "#FF3B30",
                  fontSize: 9.5,
                  fontWeight: 800,
                  padding: "2px 8px",
                  borderRadius: 20,
                  flexShrink: 0,
                }}
              >
                {paid ? "Paid" : "Due"}
              </span>
            </div>
          </div>
          <ChevronRight size={13} color="#C7C7CC" />
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button
          type="button"
          onClick={goToCourse}
          style={{
            flex: 1,
            background: "#F2F2F7",
            color: "#0B1F3A",
            border: "none",
            padding: 10,
            borderRadius: 10,
            fontSize: 12.5,
            fontWeight: 700,
            textAlign: "center",
            cursor: "pointer",
            fontFamily: "Poppins, sans-serif",
          }}
        >
          Edit course
        </button>
        <button
          type="button"
          onClick={() => navigate({ to: "/bookings" })}
          style={{
            flex: 1,
            background: "#0B1F3A",
            color: "#fff",
            border: "none",
            padding: 10,
            borderRadius: 10,
            fontSize: 12.5,
            fontWeight: 700,
            textAlign: "center",
            cursor: "pointer",
            fontFamily: "Poppins, sans-serif",
          }}
        >
          View bookings
        </button>
      </div>
    </div>
  );
}

