import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Card } from "../components/dsm/Card";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/pupils/$id")({
  component: PupilDetailPage,
});

interface Pupil {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  lesson_count: number;
  balance_owed: number;
  status: string;
}

interface Lesson {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
}

function formatTime(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function PupilDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [pupil, setPupil] = useState<Pupil | null>(null);
  const [lessons, setLessons] = useState<Lesson[] | null>(null);

  useEffect(() => {
    supabase
      .from("pupils")
      .select("id, first_name, last_name, phone, email, lesson_count, balance_owed, status")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => setPupil((data as Pupil) ?? null));

    supabase
      .from("lessons")
      .select("id, scheduled_at, duration_minutes, status")
      .eq("pupil_id", id)
      .gt("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .then(({ data }) => setLessons((data as Lesson[]) ?? []));
  }, [id]);

  const isActive = pupil?.status === "active";

  return (
    <div
      className="min-h-screen bg-white pb-8"
      style={{ fontFamily: "Poppins, sans-serif" }}
    >
      <div className="px-4 pt-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Back to pupils"
            onClick={() => navigate({ to: "/pupils" })}
            className="-ml-1 p-1 text-[#0F2044]"
          >
            <ArrowLeft size={22} />
          </button>
          <p
            className="truncate"
            style={{ fontSize: 20, fontWeight: 600, color: "#0F2044", fontFamily: "Poppins, sans-serif" }}
          >
            {pupil ? `${pupil.first_name} ${pupil.last_name}` : ""}
          </p>
        </div>

        {pupil && (
          <div className="mt-4">
            <Card>
              <div className="flex flex-col gap-2">
                <Row label="Phone" value={pupil.phone ?? "—"} />
                <Row label="Email" value={pupil.email ?? "—"} />
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-[#6B7280]">Status</span>
                  <span
                    className="text-[11px] text-white px-2 py-1 rounded-full"
                    style={{ backgroundColor: isActive ? "#16A34A" : "#6B7280" }}
                  >
                    {isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <Row label="Lesson count" value={String(pupil.lesson_count ?? 0)} />
                <Row
                  label="Balance owed"
                  value={`£${Number(pupil.balance_owed ?? 0).toFixed(2)}`}
                />
              </div>
            </Card>
          </div>
        )}

        <SectionHeader>Upcoming lessons</SectionHeader>

        {lessons === null ? null : lessons.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-[14px] text-[#6B7280]">No upcoming lessons</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {lessons.map((l) => {
              const d = new Date(l.scheduled_at);
              return (
                <Card key={l.id}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[14px] font-semibold text-[#0F2044]">
                        {formatTime(d)}
                      </div>
                      <div className="text-[13px] text-[#6B7280] truncate">
                        {formatDate(d)} · {l.duration_minutes} min
                      </div>
                    </div>
                    <span
                      className="text-[11px] text-white px-2 py-1 rounded-full shrink-0"
                      style={{
                        backgroundColor:
                          l.status === "confirmed"
                            ? "#16A34A"
                            : l.status === "cancelled"
                              ? "#CC2229"
                              : "#6B7280",
                      }}
                    >
                      {l.status.charAt(0).toUpperCase() + l.status.slice(1)}
                    </span>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[13px] text-[#6B7280]">{label}</span>
      <span className="text-[13px] text-[#0F2044] truncate text-right">{value}</span>
    </div>
  );
}
