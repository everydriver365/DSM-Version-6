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
  pickup_postcodes: { postcode: string; lat: number | null; lng: number | null }[] | null;
  image_url: string | null;
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
        .select("id, course_type, name, price, start_date, status, total_hours, max_spaces, spaces_taken, pickup_area, pickup_postcodes, image_url")
        .eq("instructor_id", uid)
        .order("created_at", { ascending: false });

      let { data, error } = await query;

      if (error?.code === "42703" && error.message.includes("pickup_postcodes")) {
        const fallback = await supabase
          .from("instructor_courses")
          .select("id, course_type, name, price, start_date, status, total_hours, max_spaces, spaces_taken, pickup_area, image_url")
          .eq("instructor_id", uid)
          .order("created_at", { ascending: false });
        data = fallback.data?.map((row) => ({ ...row, pickup_postcodes: null })) ?? null;
        error = fallback.error;
      }

      if (error?.code === "42703" && error.message.includes("image_url")) {
        const fallback = await supabase
          .from("instructor_courses")
          .select("id, course_type, name, price, start_date, status, total_hours, max_spaces, spaces_taken, pickup_area")
          .eq("instructor_id", uid)
          .order("created_at", { ascending: false });
        data = fallback.data?.map((row) => ({ ...row, pickup_postcodes: null, image_url: null })) ?? null;
        error = fallback.error;
      }

      if (error) console.error("[courses] fetch error", error);
      setCourses((data ?? []) as CourseRow[]);
      setLoading(false);
    })();
  }, []);

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
        <SectionHeader>ACTIVE COURSES</SectionHeader>

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
          <div style={{ display: "flex", flexDirection: "column" }}>
            {courses.map((c) => {
              const spacesLeft = Math.max(0, (c.max_spaces ?? 0) - (c.spaces_taken ?? 0));
              const goToCourse = () => navigate({ to: "/courses/$id", params: { id: c.id } });
              const draft = c.status === "draft";
              const pcs = (c.pickup_postcodes ?? []).map((p) => p.postcode);
              const locations = pcs.length > 0 ? pcs : c.pickup_area ? [c.pickup_area] : [];
              const hours = c.total_hours == null ? "?" : String(Number(c.total_hours));
              return (
                <div
                  key={c.id}
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
                    background: "#fff",
                    borderRadius: 18,
                    padding: 16,
                    marginBottom: 14,
                    boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 8px 22px rgba(0,0,0,0.06)",
                    cursor: "pointer",
                    userSelect: "none",
                    WebkitUserSelect: "none",
                    WebkitTapHighlightColor: "rgba(11,31,58,0.08)",
                  }}
                >
                  <div style={{ display: "flex", gap: 13, alignItems: "flex-start" }}>
                    <div style={{ flexShrink: 0, position: "relative" }}>
                      {/* Hero image if available */}
                      {c.image_url ? (
                        <img
                          src={c.image_url}
                          alt={c.name ?? ""}
                          style={{
                            width: 72,
                            height: 72,
                            borderRadius: 14,
                            objectFit: "cover",
                            display: "block",
                            border: `2px solid ${draft ? "#D1D1D6" : "#E4E8EF"}`,
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 72,
                            height: 72,
                            borderRadius: 14,
                            background: draft ? "#F2F2F7" : "#EEF2F7",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 28,
                          }}
                        >
                          🚗
                        </div>
                      )}
                      {/* Hours badge overlaid bottom-right of image */}
                      <div
                        style={{
                          position: "absolute",
                          bottom: -6,
                          right: -6,
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          background: draft ? "#D1D1D6" : "#CC2229",
                          border: "2px solid #fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 11,
                          fontWeight: 800,
                          color: "#fff",
                          fontFamily: "Poppins, sans-serif",
                          letterSpacing: "-0.3px",
                        }}
                      >
                        {hours}
                      </div>
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 16.5,
                              fontWeight: 700,
                              letterSpacing: "-0.2px",
                              color: draft ? "#8A8A8E" : "#000",
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
                              fontSize: 11.5,
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: "0.3px",
                              color: draft ? "#B0B0B5" : "#1877D6",
                            }}
                          >
                            {typeLabel(c.course_type)}
                          </div>
                        </div>
                        <div
                          style={{
                            fontSize: 19,
                            fontWeight: 800,
                            letterSpacing: "-0.3px",
                            color: draft ? "#C7C7CC" : "#000",
                            whiteSpace: "nowrap",
                          }}
                        >
                          £{Number(c.price).toFixed(0)}
                        </div>
                      </div>

                      {locations.length > 0 && (
                        <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 500, color: "#8A8A8E" }}>
                          <MapPin size={13} color="#8A8A8E" />
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {locations.length > 1 ? `${locations.length} locations` : locations[0]}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: 14,
                      paddingTop: 13,
                      borderTop: "1px solid #F0F0F2",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <div style={{ fontSize: 12.5, fontWeight: 500, color: "#8A8A8E" }}>{formatDate(c.start_date)}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          background: draft ? "#F2F2F7" : "#E7F1FC",
                          color: draft ? "#8A8A8E" : "#1877D6",
                          fontSize: 10.5,
                          fontWeight: 700,
                          padding: "4px 10px",
                          borderRadius: 20,
                        }}
                      >
                        {draft ? "Draft" : "Active"}
                      </span>
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: spacesLeft <= 1 ? "#FF3B30" : "#8A8A8E" }}>
                        {spacesLeft} spaces left
                      </span>
                    </div>
                  </div>

                  <div style={{ marginTop: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        goToCourse();
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                        color: draft ? "#8A8A8E" : "#1877D6",
                        fontSize: 14,
                        fontWeight: 600,
                        fontFamily: "Poppins, sans-serif",
                      }}
                    >
                      {draft ? "Finish setup" : "Edit course"}
                    </button>
                    <span
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        background: "#F2F2F7",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <ChevronRight size={16} color="#C7C7CC" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
