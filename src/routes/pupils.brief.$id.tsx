import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  IconAlertTriangle,
  IconCalendar,
  IconChevronRight,
  IconClock,
  IconMapPin,
  IconNotes,
  IconRoute,
  IconSteeringWheel,
  IconTrophy,
} from "@tabler/icons-react";

import DSMTopSheet from "@/components/dsm/DSMTopSheet";
import { SectionHeader } from "@/components/dsm/SectionHeader";
import RecommendedLearning from "@/components/learn/RecommendedLearning";
import {
  LEVEL_LABEL,
  LEVEL_META,
  LEVEL_RANK,
  fetchPupilBrief,
  formatDayGap,
  frequentRoads,
  parseLessonNotes,
  roadsFromCoords,
  routeStaticMapUrl,
  splitCovered,
  type PupilBriefData,
} from "@/lib/pupilBrief";

export const Route = createFileRoute("/pupils/brief/$id")({
  head: () => ({ meta: [{ title: "Pupil brief — DSM by EveryDriver" }] }),
  component: PupilBriefPage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;
const NAVY = "#0F2044";
const BLUE = "#1877D6";
const MUTED = "#6B7A90";
const BORDER = "0.5px solid rgba(15,32,68,0.10)";

function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: 8,
        border: BORDER,
        padding: 16,
        ...POPPINS,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Chip({
  label,
  color = NAVY,
  bg = "#F3F5F8",
}: {
  label: string;
  color?: string;
  bg?: string;
}) {
  return (
    <span
      style={{
        ...POPPINS,
        display: "inline-block",
        padding: "5px 10px",
        borderRadius: 999,
        background: bg,
        color,
        fontSize: 12,
        fontWeight: 600,
        lineHeight: 1.2,
      }}
    >
      {label}
    </span>
  );
}

function EmptyLine({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ ...POPPINS, fontSize: 13, color: MUTED }}>{children}</div>
  );
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "";
  return new Date(`${d}T00:00:00`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
function fmtTime(t: string | null | undefined) {
  return (t ?? "").slice(0, 5);
}

function PupilBriefPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<PupilBriefData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchPupilBrief(id)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        console.error("[pupil-brief] load failed", e);
        if (!cancelled) toast.error("Could not load the brief");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const pupil = data?.pupil ?? null;
  const firstName = pupil?.first_name || (pupil?.name ?? "").split(" ")[0] || "";

  const parsed = useMemo(
    () => parseLessonNotes(data?.lastHistory?.notes ?? data?.lastLesson?.notes),
    [data?.lastHistory?.notes, data?.lastLesson?.notes],
  );

  const covered = useMemo(
    () => splitCovered(data?.lastHistory ?? null, data?.lastFeedback ?? null, parsed),
    [data?.lastHistory, data?.lastFeedback, parsed],
  );

  const roads = useMemo(
    () => roadsFromCoords(data?.lastRoute?.coordinates, 8),
    [data?.lastRoute],
  );
  const mapUrl = useMemo(
    () => routeStaticMapUrl(data?.lastRoute?.coordinates),
    [data?.lastRoute],
  );
  const areas = useMemo(() => frequentRoads(data?.recentRoutes ?? [], 10), [data?.recentRoutes]);

  /** What still needs work: recorded progress below "seldom prompted". */
  const continueItems = useMemo(() => {
    const items = (data?.progress ?? []).filter((p) => LEVEL_RANK[p.status] <= 3);
    return items
      .sort(
        (a, b) =>
          LEVEL_RANK[a.status] - LEVEL_RANK[b.status] ||
          (b.updated_at ?? "").localeCompare(a.updated_at ?? ""),
      )
      .slice(0, 6);
  }, [data?.progress]);

  const strongItems = useMemo(
    () => (data?.progress ?? []).filter((p) => LEVEL_RANK[p.status] >= 4).slice(0, 8),
    [data?.progress],
  );

  const lastGap = formatDayGap(data?.lastLesson?.lesson_date ?? data?.lastHistory?.lesson_date);

  const testDaysAway = useMemo(() => {
    if (!pupil?.test_date) return null;
    const d = Math.round(
      (new Date(`${pupil.test_date}T00:00:00`).getTime() - new Date().setHours(0, 0, 0, 0)) /
        86400000,
    );
    return d;
  }, [pupil?.test_date]);

  return (
    <DSMTopSheet title="Pupil Brief" onBack={() => navigate({ to: "/pupils/$id", params: { id } } as never)}>
      <div style={POPPINS}>
      <div className="px-4 mt-3">
        {loading ? (
          <EmptyLine>Loading brief…</EmptyLine>
        ) : !pupil ? (
          <EmptyLine>Pupil not found.</EmptyLine>
        ) : (
          <>
            {/* ---------- 10-second brief ---------- */}
            <Card
              style={{
                background: "linear-gradient(135deg, #0F2044 0%, #1A52A0 100%)",
                border: "none",
                color: "#FFFFFF",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, opacity: 0.75 }}>
                10-SECOND BRIEF
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>
                {pupil.name || firstName || "Pupil"}
              </div>

              {data?.nextLesson ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 10,
                    fontSize: 13,
                    fontWeight: 500,
                    opacity: 0.95,
                  }}
                >
                  <IconCalendar size={16} color="#FFFFFF" />
                  Next lesson {fmtDate(data.nextLesson.lesson_date)}
                  {data.nextLesson.lesson_time ? ` · ${fmtTime(data.nextLesson.lesson_time)}` : ""}
                  {data.nextLesson.duration_minutes ? ` · ${data.nextLesson.duration_minutes} min` : ""}
                </div>
              ) : null}

              {data?.nextLesson?.pickup_location ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 6,
                    fontSize: 13,
                    opacity: 0.9,
                  }}
                >
                  <IconMapPin size={16} color="#FFFFFF" />
                  Pick up: {data.nextLesson.pickup_location}
                </div>
              ) : null}

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 6,
                  fontSize: 13,
                  opacity: 0.9,
                }}
              >
                <IconClock size={16} color="#FFFFFF" />
                {lastGap ? `Last lesson ${lastGap.toLowerCase()}` : "No previous lesson recorded"}
              </div>

              {continueItems.length > 0 ? (
                <div style={{ marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {continueItems.slice(0, 3).map((p) => (
                    <span
                      key={p.item_key}
                      style={{
                        ...POPPINS,
                        padding: "5px 10px",
                        borderRadius: 999,
                        background: "rgba(255,255,255,0.16)",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      Continue: {p.label}
                    </span>
                  ))}
                </div>
              ) : null}

              {testDaysAway != null && testDaysAway >= 0 ? (
                <div
                  style={{
                    marginTop: 12,
                    padding: "8px 10px",
                    borderRadius: 8,
                    background: "rgba(255,255,255,0.14)",
                    fontSize: 12.5,
                    fontWeight: 600,
                  }}
                >
                  Test {testDaysAway === 0 ? "today" : `in ${testDaysAway} day${testDaysAway === 1 ? "" : "s"}`}
                  {pupil.test_centre ? ` · ${pupil.test_centre}` : ""}
                </div>
              ) : null}
            </Card>

            {/* ---------- Last lesson ---------- */}
            <SectionHeader>LAST LESSON</SectionHeader>
            {data?.lastLesson || data?.lastHistory ? (
              <Card>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>
                    {fmtDate(data.lastLesson?.lesson_date ?? data.lastHistory?.lesson_date)}
                  </div>
                  <div style={{ fontSize: 12.5, color: MUTED }}>
                    {fmtTime(data.lastLesson?.lesson_time ?? data.lastHistory?.lesson_time)}
                    {(data.lastLesson?.duration_minutes ?? data.lastHistory?.duration_minutes)
                      ? ` · ${data.lastLesson?.duration_minutes ?? data.lastHistory?.duration_minutes} min`
                      : ""}
                    {lastGap ? ` · ${lastGap}` : ""}
                  </div>
                </div>

                {data.lastFeedback?.progress_rating != null ? (
                  <div style={{ marginTop: 8 }}>
                    <Chip
                      label={`Progress rated ${data.lastFeedback.progress_rating}/5`}
                      color={BLUE}
                      bg="#EAF3FC"
                    />
                  </div>
                ) : null}

                {parsed.body || data.lastFeedback?.instructor_notes ? (
                  <div
                    style={{
                      marginTop: 10,
                      fontSize: 13.5,
                      lineHeight: 1.5,
                      color: "#334155",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {parsed.body ?? data.lastFeedback?.instructor_notes}
                  </div>
                ) : (
                  <div style={{ marginTop: 10 }}>
                    <EmptyLine>No notes recorded for the last lesson.</EmptyLine>
                  </div>
                )}

                {parsed.progress ? (
                  <div
                    style={{
                      marginTop: 10,
                      padding: 10,
                      borderRadius: 8,
                      background: "#F3FAE9",
                      fontSize: 13,
                      color: "#3F6212",
                      lineHeight: 1.45,
                    }}
                  >
                    <IconNotes size={14} color="#4D7C0F" style={{ display: "inline", marginRight: 6 }} />
                    {parsed.progress}
                  </div>
                ) : null}
              </Card>
            ) : (
              <Card>
                <EmptyLine>No previous lessons recorded for this pupil yet.</EmptyLine>
              </Card>
            )}

            {/* ---------- Where we went ---------- */}
            <SectionHeader>WHERE WE WENT</SectionHeader>
            <Card style={{ padding: mapUrl ? 0 : 16, overflow: "hidden" }}>
              {mapUrl ? (
                <img
                  src={mapUrl}
                  alt="Route driven on the last lesson"
                  style={{ width: "100%", display: "block" }}
                  loading="lazy"
                />
              ) : null}
              <div style={{ padding: mapUrl ? 16 : 0 }}>
                {data?.lastRoute ? (
                  <div style={{ display: "flex", gap: 14, fontSize: 12.5, color: MUTED }}>
                    {data.lastRoute.distance_miles != null ? (
                      <span>
                        <IconRoute size={14} style={{ display: "inline", marginRight: 4 }} />
                        {data.lastRoute.distance_miles.toFixed(1)} mi
                      </span>
                    ) : null}
                    {data.lastRoute.duration_minutes != null ? (
                      <span>{data.lastRoute.duration_minutes} min driving</span>
                    ) : null}
                    {data.lastRoute.max_speed_mph != null ? (
                      <span>Max {Math.round(data.lastRoute.max_speed_mph)} mph</span>
                    ) : null}
                  </div>
                ) : null}

                {roads.length > 0 ? (
                  <>
                    <div style={{ fontSize: 12, fontWeight: 700, color: NAVY, marginTop: 12 }}>
                      Roads driven last lesson
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                      {roads.map((r) => (
                        <Chip key={r} label={r} />
                      ))}
                    </div>
                  </>
                ) : !data?.lastRoute ? (
                  <EmptyLine>No GPS track recorded for the last lesson.</EmptyLine>
                ) : null}

                {areas.length > 0 ? (
                  <>
                    <div style={{ fontSize: 12, fontWeight: 700, color: NAVY, marginTop: 14 }}>
                      Areas practised recently
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                      {areas.map((a) => (
                        <Chip
                          key={a.name}
                          label={a.count > 1 ? `${a.name} ×${a.count}` : a.name}
                          color={BLUE}
                          bg="#EAF3FC"
                        />
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
            </Card>

            {/* ---------- Covered last time ---------- */}
            <SectionHeader>COVERED LAST TIME</SectionHeader>
            <Card>
              <div style={{ fontSize: 12, fontWeight: 700, color: NAVY }}>Manoeuvres</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                {covered.manoeuvres.length > 0 ? (
                  covered.manoeuvres.map((m) => (
                    <Chip key={m} label={m} color="#7C3AED" bg="#F5F0FE" />
                  ))
                ) : (
                  <EmptyLine>No manoeuvres recorded.</EmptyLine>
                )}
              </div>

              <div style={{ fontSize: 12, fontWeight: 700, color: NAVY, marginTop: 14 }}>Topics</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                {covered.topics.length > 0 ? (
                  covered.topics.map((t) => <Chip key={t} label={t} />)
                ) : (
                  <EmptyLine>No topics recorded.</EmptyLine>
                )}
              </div>
            </Card>

            {/* ---------- What needs continuing ---------- */}
            <SectionHeader>WHAT NEEDS CONTINUING</SectionHeader>
            <Card>
              {continueItems.length > 0 ? (
                continueItems.map((p, i) => {
                  const meta = LEVEL_META[p.status];
                  return (
                    <div
                      key={p.item_key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 0",
                        borderTop: i === 0 ? "none" : BORDER,
                      }}
                    >
                      <IconSteeringWheel size={18} color={meta.color} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: NAVY }}>{p.label}</div>
                        <div style={{ fontSize: 12, color: MUTED }}>{LEVEL_LABEL[p.status]}</div>
                      </div>
                      <Chip label={meta.verdict} color={meta.color} bg={meta.bg} />
                    </div>
                  );
                })
              ) : (
                <EmptyLine>
                  No progress items are below "seldom prompted" — nothing flagged to continue.
                </EmptyLine>
              )}
              <button
                type="button"
                onClick={() => navigate({ to: "/pupils/progress/$id", params: { id } } as never)}
                style={{
                  ...POPPINS,
                  marginTop: 12,
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: `1px solid ${BLUE}`,
                  background: "#FFFFFF",
                  color: BLUE,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Open full progress
              </button>
            </Card>

            {/* ---------- Strengths ---------- */}
            {strongItems.length > 0 ? (
              <>
                <SectionHeader>GOING WELL</SectionHeader>
                <Card>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {strongItems.map((p) => (
                      <Chip
                        key={p.item_key}
                        label={p.label}
                        color={LEVEL_META[p.status].color}
                        bg={LEVEL_META[p.status].bg}
                      />
                    ))}
                  </div>
                </Card>
              </>
            ) : null}

            {/* ---------- Test preparation ---------- */}
            {pupil.test_date ? (
              <>
                <SectionHeader>TEST PREPARATION</SectionHeader>
                <Card>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <IconTrophy size={20} color="#B45309" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>
                        {fmtDate(pupil.test_date)}
                        {pupil.test_time ? ` · ${fmtTime(pupil.test_time)}` : ""}
                      </div>
                      <div style={{ fontSize: 12.5, color: MUTED }}>
                        {pupil.test_centre || "Test centre not recorded"}
                        {pupil.theory_pass ? " · Theory passed" : ""}
                      </div>
                    </div>
                  </div>
                  {continueItems.length > 0 ? (
                    <div
                      style={{
                        marginTop: 12,
                        padding: 10,
                        borderRadius: 8,
                        background: "#FFF8EB",
                        color: "#B45309",
                        fontSize: 13,
                        lineHeight: 1.45,
                      }}
                    >
                      <IconAlertTriangle
                        size={14}
                        color="#B45309"
                        style={{ display: "inline", marginRight: 6 }}
                      />
                      Still to firm up before test: {continueItems.map((p) => p.label).join(", ")}
                    </div>
                  ) : null}
                  <button
                    type="button"
                    onClick={() =>
                      navigate({ to: "/test-day/$pupilId", params: { pupilId: id } } as never)
                    }
                    style={{
                      ...POPPINS,
                      marginTop: 12,
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "none",
                      background: BLUE,
                      color: "#FFFFFF",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Open test day plan
                  </button>
                </Card>
              </>
            ) : null}

            {/* ---------- Revision suggestions (existing engine) ---------- */}
            {data?.faults ? (
              <div style={{ marginTop: 4 }}>
                <RecommendedLearning faults={data.faults} />
                <div style={{ fontSize: 11.5, color: MUTED, marginTop: 6 }}>
                  Based on the latest {data.faultsSource === "test" ? "driving test" : "mock test"}
                  {data.faultsDate ? ` (${fmtDate(data.faultsDate)})` : ""}.
                </div>
              </div>
            ) : null}

            {/* ---------- Previous lessons ---------- */}
            <SectionHeader>PREVIOUS LESSONS</SectionHeader>
            <Card style={{ padding: 0, overflow: "hidden" }}>
              {(data?.recentLessons ?? []).length === 0 ? (
                <div style={{ padding: 16 }}>
                  <EmptyLine>No lesson history yet.</EmptyLine>
                </div>
              ) : (
                (data?.recentLessons ?? []).map((l, i) => {
                  const h = data?.historyByLessonId[l.id];
                  const f = data?.feedbackByLessonId[l.id];
                  const p = parseLessonNotes(h?.notes ?? l.notes);
                  const c = splitCovered(h ?? null, f ?? null, p);
                  const summary = [...c.manoeuvres, ...c.topics].slice(0, 4).join(" · ");
                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => navigate({ to: "/lessons/$id", params: { id: l.id } } as never)}
                      style={{
                        ...POPPINS,
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 16px",
                        background: "transparent",
                        border: "none",
                        borderTop: i === 0 ? "none" : BORDER,
                        textAlign: "left",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: NAVY }}>
                          {fmtDate(l.lesson_date)}
                          {l.duration_minutes ? ` · ${l.duration_minutes} min` : ""}
                        </div>
                        <div
                          style={{
                            fontSize: 12.5,
                            color: MUTED,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {summary || p.body || "No detail recorded"}
                        </div>
                      </div>
                      <IconChevronRight size={16} color={MUTED} />
                    </button>
                  );
                })
              )}
            </Card>
          </>
        )}
      </div>
    </div>
    </DSMTopSheet>
  );
}
