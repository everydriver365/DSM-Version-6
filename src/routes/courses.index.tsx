import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft, Plus, GraduationCap, ChevronRight, Pencil, MapPin } from "lucide-react";
import { Card } from "../components/dsm/Card";
import { SectionHeader } from "../components/dsm/SectionHeader";
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
  max_spaces: number;
  spaces_taken: number;
}

function typeColor(t: string) {
  if (t === "intensive") return "#CC2229";
  if (t === "semi-intensive") return "#F59E0B";
  if (t === "weekly") return "#16A34A";
  return "#1A52A0";
}
function typeLabel(t: string) {
  if (t === "intensive") return "Intensive";
  if (t === "semi-intensive") return "Semi-intensive";
  if (t === "weekly") return "Weekly";
  return "Custom";
}
function statusColor(s: string) {
  if (s === "active") return "#16A34A";
  if (s === "draft") return "#F59E0B";
  if (s === "full") return "#CC2229";
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
      const { data, error } = await supabase
        .from("instructor_courses")
        .select("id, course_type, name, price, start_date, status, max_spaces, spaces_taken")
        .eq("instructor_id", uid)
        .order("created_at", { ascending: false });
      if (error) console.error("[courses] fetch error", error);
      setCourses((data ?? []) as CourseRow[]);
      setLoading(false);
    })();
  }, []);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F2F4F8", ...POPPINS }}>
      {/* Top bar */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          backgroundColor: "#0F2044",
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <button
          onClick={() => navigate({ to: "/home" })}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#fff", display: "flex" }}
          aria-label="Back"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 style={{ color: "#fff", fontSize: 16, fontWeight: 700, margin: 0 }}>My courses</h1>
        <button
          onClick={() => navigate({ to: "/courses/new" })}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#fff", display: "flex" }}
          aria-label="New course"
        >
          <Plus size={24} />
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
                background: "#1A52A0",
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
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {courses.map((c) => {
              const spacesLeft = Math.max(0, (c.max_spaces ?? 0) - (c.spaces_taken ?? 0));
              const goToCourse = () => navigate({ to: "/courses/$id", params: { id: c.id } });
              return (
                <Card
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
                    cursor: "pointer",
                    padding: 12,
                    userSelect: "none",
                    WebkitUserSelect: "none",
                    WebkitTapHighlightColor: "rgba(15,32,68,0.08)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span
                      style={{
                        background: typeColor(c.course_type),
                        color: "#fff",
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "3px 8px",
                        borderRadius: 6,
                        textTransform: "uppercase",
                        letterSpacing: 0.4,
                      }}
                    >
                      {typeLabel(c.course_type)}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: "#0F2044",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {c.name}
                      </div>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#0F2044" }}>
                      £{Number(c.price).toFixed(0)}
                    </div>
                  </div>
                  <div
                    style={{
                      marginTop: 8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <div style={{ fontSize: 13, color: "#6B7280" }}>{formatDate(c.start_date)}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          background: statusColor(c.status),
                          color: "#fff",
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: 6,
                          textTransform: "uppercase",
                          letterSpacing: 0.4,
                        }}
                      >
                        {c.status}
                      </span>
                      <span style={{ fontSize: 12, color: "#6B7280" }}>
                        {spacesLeft} spaces left
                      </span>
                    </div>
                  </div>
                  <div
                    style={{
                      marginTop: 10,
                      paddingTop: 10,
                      borderTop: "0.5px solid #E2E6ED",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        goToCourse();
                      }}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        background: "#0F2044",
                        color: "#fff",
                        border: "none",
                        borderRadius: 8,
                        padding: "8px 12px",
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: "pointer",
                        fontFamily: "Poppins, sans-serif",
                      }}
                    >
                      <Pencil size={14} />
                      Edit course
                    </button>
                    <ChevronRight size={18} color="#6B7280" />
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
