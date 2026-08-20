import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { tokens } from "@/lib/tokens";
import { useEffect, useRef, useState } from "react";
import { IconArrowLeft, IconCircleCheck } from "@tabler/icons-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

export const Route = createFileRoute("/terms_/sign/$pupilId")({
  component: SignTermsPage,
  head: () => ({
    meta: [
      { title: "Sign terms & conditions | DSM" },
      { name: "description", content: "Review and sign your instructor's terms and conditions." },
      { property: "og:title", content: "Sign terms & conditions | DSM" },
      { property: "og:description", content: "Review and sign your instructor's terms and conditions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";

const POPPINS = { fontFamily: "Poppins, sans-serif" as const };
const NAVY = "#0B1F3A";
const BLUE = "#1877D6";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 16px",
  border: "1px solid #EEF2F7",
  borderRadius: tokens.radiusCard,
  fontSize: tokens.fontSize.md,
  fontFamily: "Poppins, sans-serif",
  background: "#fff",
  color: NAVY,
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: tokens.fontWeight.semibold,
  color: "#6B7280",
  marginBottom: 4,
  display: "block",
};

type Pupil = {
  id: string;
  name: string;
  email: string | null;
  date_of_birth: string | null;
};

type InstructorTerms = {
  content: string;
  version: number;
};

function ageInYears(dobIso: string): number {
  const dob = new Date(dobIso);
  if (isNaN(dob.getTime())) return NaN;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}

function SignTermsPage() {
  const { pupilId } = Route.useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [pupil, setPupil] = useState<Pupil | null>(null);
  const [terms, setTerms] = useState<InstructorTerms | null>(null);
  const [instructorId, setInstructorId] = useState<string | null>(null);
  const [instructorName, setInstructorName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const [signedByName, setSignedByName] = useState("");
  const [relationship, setRelationship] = useState<"Parent" | "Legal guardian" | "Other">("Parent");
  const [hasSignature, setHasSignature] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ emailed: boolean } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const isMinor =
    !!pupil?.date_of_birth && !isNaN(ageInYears(pupil.date_of_birth)) && ageInYears(pupil.date_of_birth) < 18;

  // Load pupil + instructor + terms
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth.user?.id ?? null;
        setInstructorId(uid);

        const [pRes, tRes, iRes] = await Promise.all([
          supabase
            .from("pupils")
            .select("id, name, email, date_of_birth")
            .eq("id", pupilId)
            .maybeSingle(),
          uid
            ? supabase
                .from("instructor_terms")
                .select("content, version")
                .eq("instructor_id", uid)
                .maybeSingle()
            : Promise.resolve({ data: null, error: null } as any),
          uid
            ? supabase.from("instructors").select("name, full_name").eq("id", uid).maybeSingle()
            : Promise.resolve({ data: null, error: null } as any),
        ]);

        if (pRes.error) throw pRes.error;
        if (!pRes.data) {
          setError("Pupil not found.");
          return;
        }
        setPupil(pRes.data as Pupil);
        if (tRes && !("error" in tRes && tRes.error)) {
          setTerms((tRes.data as InstructorTerms) ?? null);
        }
        const iName =
          (iRes?.data as any)?.full_name || (iRes?.data as any)?.name || "";
        setInstructorName(iName);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [pupilId]);

  // Canvas init + sizing (retina + responsive)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = NAVY;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, rect.width, rect.height);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [loading, success]);

  function pointFromEvent(e: PointerEvent | TouchEvent | MouseEvent): { x: number; y: number } | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;
    if ("touches" in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ("clientX" in e) {
      clientX = (e as MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY;
    } else {
      return null;
    }
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  function startDraw(e: React.PointerEvent | React.TouchEvent | React.MouseEvent) {
    e.preventDefault();
    drawingRef.current = true;
    const p = pointFromEvent(e.nativeEvent as any);
    lastPointRef.current = p;
  }

  function moveDraw(e: React.PointerEvent | React.TouchEvent | React.MouseEvent) {
    if (!drawingRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const p = pointFromEvent(e.nativeEvent as any);
    if (!p) return;
    const last = lastPointRef.current;
    if (last) {
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    lastPointRef.current = p;
    if (!hasSignature) setHasSignature(true);
  }

  function endDraw() {
    drawingRef.current = false;
    lastPointRef.current = null;
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    setHasSignature(false);
  }

  const canSubmit =
    !!pupil &&
    !!terms &&
    !!instructorId &&
    hasSignature &&
    signedByName.trim().length > 0 &&
    (!isMinor || !!relationship) &&
    !submitting;

  async function handleSubmit() {
    if (!canSubmit || !pupil || !terms || !instructorId) return;
    setSubmitting(true);
    try {
      const canvas = canvasRef.current;
      if (!canvas) throw new Error("Signature not available");
      const signatureData = canvas.toDataURL("image/png");

      const insertBody: Record<string, unknown> = {
        pupil_id: pupil.id,
        instructor_id: instructorId,
        terms_type: "instructor",
        terms_version: terms.version,
        signature_data: signatureData,
        signed_by_name: signedByName.trim(),
        is_guardian: isMinor,
        guardian_relationship: isMinor ? relationship : null,
      };

      const { error: insErr } = await supabase.from("pupil_terms_signatures").insert(insertBody);
      if (insErr) throw insErr;

      let emailed = false;
      if (pupil.email) {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          const token = session?.access_token;
          const res = await fetch(`${SUPABASE_URL}/functions/v1/send-terms-email`, {
            method: "POST",
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${token ?? SUPABASE_ANON_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              pupilEmail: pupil.email,
              pupilName: pupil.name,
              signedByName: signedByName.trim(),
              isGuardian: isMinor,
              guardianRelationship: isMinor ? relationship : null,
              termsType: "instructor",
              termsContent: terms.content,
              instructorName,
              signedAt: new Date().toISOString(),
            }),
          });
          emailed = res.ok;
        } catch {
          emailed = false;
        }
      }

      setSuccess({ emailed });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save signature");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F5F7FB", ...POPPINS }}>
      {/* Header */}
      <div
        style={{
          background: NAVY,
          color: "#fff",
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <button
          type="button"
          onClick={() => navigate({ to: "/pupils" })}
          aria-label="Back"
          style={{
            background: "transparent",
            border: "none",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            padding: 4,
            cursor: "pointer",
          }}
        >
          <IconArrowLeft stroke={1.5} size={20} />
        </button>
        <div style={{ fontSize: tokens.fontSize.lg, fontWeight: 700 }}>Sign terms & conditions</div>
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: 16 }}>
        {loading ? (
          <div style={{ color: "#6B7280", fontSize: 14 }}>Loading…</div>
        ) : error ? (
          <div
            style={{
              background: "#fff",
              border: "1px solid #FEE2E2",
              color: "#B91C1C",
              padding: 16,
              borderRadius: tokens.radiusCard,
              fontSize: tokens.fontSize.md,
            }}
          >
            {error}
          </div>
        ) : success ? (
          <div
            style={{
              background: "#fff",
              border: "1px solid #EEF2F7",
              borderRadius: tokens.radiusCard,
              padding: 16,
              textAlign: "center",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
              <IconCircleCheck stroke={1.5} size={40} color="#1B7F3B" />
            </div>
            <div style={{ fontSize: tokens.fontSize.xl, fontWeight: tokens.fontWeight.bold, color: NAVY, marginBottom: 6 }}>
              Terms signed
            </div>
            <div style={{ fontSize: tokens.fontSize.md, color: "#6B7280" }}>
              {success.emailed
                ? "A confirmation copy has been emailed."
                : pupil?.email
                ? "Signed. (Email confirmation could not be sent.)"
                : "Signed."}
            </div>
            <button
              type="button"
              onClick={() => navigate({ to: "/pupils" })}
              style={{
                marginTop: 18,
                background: BLUE,
                color: "#fff",
                border: "none",
                borderRadius: tokens.radiusCard,
                padding: "12px 16px",
                fontSize: tokens.fontSize.md,
                fontWeight: tokens.fontWeight.semibold,
                cursor: "pointer",
                fontFamily: "Poppins, sans-serif",
              }}
            >
              Done
            </button>
          </div>
        ) : !pupil ? null : !terms ? (
          <div
            style={{
              background: "#fff",
              border: "1px solid #EEF2F7",
              borderRadius: tokens.radiusCard,
              padding: 16,
              fontSize: tokens.fontSize.md,
              color: "#6B7280",
            }}
          >
            Your terms & conditions haven't been set up yet. Add them in Settings → Terms first.
          </div>
        ) : (
          <>
            {/* Pupil summary */}
            <div
              style={{
                background: "#fff",
                border: "1px solid #EEF2F7",
                borderRadius: tokens.radiusCard,
                padding: 16,
                marginBottom: 12,
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}
            >
              <div style={{ fontSize: 12, color: "#6B7280", fontWeight: 600 }}>Signing for</div>
              <div style={{ fontSize: tokens.fontSize.lg, fontWeight: tokens.fontWeight.bold, color: NAVY }}>{pupil.name}</div>
              {pupil.email ? (
                <div style={{ fontSize: tokens.fontSize.base, color: "#6B7280", marginTop: 2 }}>{pupil.email}</div>
              ) : null}
            </div>

            {/* Terms content */}
            <div
              style={{
                background: "#fff",
                border: "1px solid #EEF2F7",
                borderRadius: tokens.radiusCard,
                padding: 16,
                marginBottom: 12,
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}
            >
              <div style={{ fontSize: 12, color: "#6B7280", fontWeight: tokens.fontWeight.semibold, marginBottom: 8 }}>
                Terms & conditions (v{terms.version})
              </div>
              <div
                style={{
                  maxHeight: 260,
                  overflowY: "auto",
                  whiteSpace: "pre-wrap",
                  fontSize: 13.5,
                  lineHeight: 1.55,
                  color: NAVY,
                  background: "#F9FAFC",
                  border: "1px solid #EEF2F7",
                  borderRadius: tokens.radiusCard,
                  padding: 16,
                }}
              >
                {terms.content}
              </div>
            </div>

            {/* Minor notice */}
            {isMinor ? (
              <div
                style={{
                  background: "#FFF7E6",
                  border: "1px solid #FDE7B5",
                  color: "#8A5A00",
                  padding: 16,
                  borderRadius: tokens.radiusCard,
                  fontSize: tokens.fontSize.base,
                  marginBottom: 12,
                }}
              >
                This pupil is under 18 — a parent or guardian must sign.
              </div>
            ) : null}

            {/* Signature pad */}
            <div
              style={{
                background: "#fff",
                border: "1px solid #EEF2F7",
                borderRadius: tokens.radiusCard,
                padding: 16,
                marginBottom: 12,
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <label style={{ ...labelStyle, marginBottom: 0 }}>Signature</label>
                <button
                  type="button"
                  onClick={clearCanvas}
                  style={{
                    background: "transparent",
                    border: "1px solid #EEF2F7",
                    color: NAVY,
                    borderRadius: tokens.radiusCard,
                    padding: "6px 16px",
                    fontSize: 12,
                    fontWeight: tokens.fontWeight.semibold,
                    cursor: "pointer",
                    fontFamily: "Poppins, sans-serif",
                  }}
                >
                  Clear
                </button>
              </div>
              <div
                style={{
                  border: "1px dashed #C7CDD6",
                  borderRadius: 8,
                  background: "#fff",
                  height: 180,
                  touchAction: "none",
                }}
              >
                <canvas
                  ref={canvasRef}
                  style={{ width: "100%", height: "100%", display: "block", borderRadius: 8}}
                  onMouseDown={startDraw}
                  onMouseMove={moveDraw}
                  onMouseUp={endDraw}
                  onMouseLeave={endDraw}
                  onTouchStart={startDraw}
                  onTouchMove={moveDraw}
                  onTouchEnd={endDraw}
                />
              </div>
              <div style={{ fontSize: tokens.fontSize.sm, color: tokens.textMuted, marginTop: 6 }}>
                Draw your signature above.
              </div>
            </div>

            {/* Signed by */}
            <div
              style={{
                background: "#fff",
                border: "1px solid #EEF2F7",
                borderRadius: tokens.radiusCard,
                padding: 16,
                marginBottom: 12,
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}
            >
              <label style={labelStyle}>Signed by (full name)</label>
              <input
                type="text"
                value={signedByName}
                onChange={(e) => setSignedByName(e.target.value)}
                placeholder="Full name"
                style={inputStyle}
              />

              {isMinor ? (
                <div style={{ marginTop: 12 }}>
                  <label style={labelStyle}>Relationship to pupil</label>
                  <select
                    value={relationship}
                    onChange={(e) =>
                      setRelationship(e.target.value as "Parent" | "Legal guardian" | "Other")
                    }
                    style={inputStyle}
                  >
                    <option value="Parent">Parent</option>
                    <option value="Legal guardian">Legal guardian</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              ) : null}
            </div>

            {/* Submit */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: tokens.radiusCard,
                background: canSubmit ? BLUE : "#B8CBE3",
                color: "#fff",
                border: "none",
                fontSize: 15,
                fontWeight: tokens.fontWeight.bold,
                cursor: canSubmit ? "pointer" : "not-allowed",
                fontFamily: "Poppins, sans-serif",
                marginBottom: 24,
              }}
            >
              {submitting ? "Signing…" : "Sign & confirm"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
