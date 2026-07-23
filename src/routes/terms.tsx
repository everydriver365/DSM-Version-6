import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabaseClient";
import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/dsm/Button";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — DSM by EveryDriver" },
      { name: "description", content: "Edit your instructor terms and conditions." },
    ],
  }),
  component: TermsPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;
const NAVY = "#0B1F3A";
const BORDER = "#E2E6ED";
const MUTED = "#6B7280";
const BLUE = "#1877D6";

interface InstructorTerms {
  instructor_id: string;
  content: string;
  version: number;
  updated_at: string | null;
  created_at: string | null;
}

function relativeTime(iso: string | null | undefined) {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  const now = Date.now();
  const seconds = Math.floor((now - then) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

function TermsPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [terms, setTerms] = useState<InstructorTerms | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data.user?.id ?? null);
    })();
  }, []);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("instructor_terms")
        .select("instructor_id, content, version, updated_at, created_at")
        .eq("instructor_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Failed to fetch terms", error);
        toast.error("Could not load your terms");
      } else if (data) {
        const row = data as InstructorTerms;
        setTerms(row);
        setContent(row.content ?? "");
        setOriginalContent(row.content ?? "");
      }
      setLoading(false);
    })();
  }, [userId]);

  async function handleSave() {
    if (!userId) return;
    const trimmed = content.trim();
    const changed = trimmed !== (originalContent ?? "").trim();

    setSaving(true);
    const nextVersion = terms ? (changed ? (terms.version ?? 0) + 1 : terms.version ?? 1) : 1;

    const { error } = await supabase.from("instructor_terms").upsert(
      {
        instructor_id: userId,
        content: trimmed,
        version: nextVersion,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "instructor_id" },
    );

    setSaving(false);
    if (error) {
      console.error("Failed to save terms", error);
      toast.error("Failed to save terms");
      return;
    }

    setOriginalContent(trimmed);
    setTerms((prev) =>
      prev
        ? { ...prev, content: trimmed, version: nextVersion, updated_at: new Date().toISOString() }
        : {
            instructor_id: userId,
            content: trimmed,
            version: nextVersion,
            updated_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          },
    );
    toast.success("Terms saved");
  }

  const lastUpdated = relativeTime(terms?.updated_at ?? terms?.created_at);

  return (
    <PageLayout className="pb-24 pb-safe relative" style={POPPINS}>
      {/* Header */}
      <div className="sticky top-0 z-40" style={{ backgroundColor: NAVY }}>
        <div className="flex items-center justify-between px-3" style={{ height: 52 }}>
          <button
            type="button"
            aria-label="Back"
            onClick={() => navigate({ to: "/more" })}
            className="flex items-center justify-center"
            style={{ width: 36, height: 36 }}
          >
            <ArrowLeft size={22} color="#fff" />
          </button>
          <div className="text-[16px] font-semibold text-white" style={POPPINS}>
            Terms & Conditions
          </div>
          <div style={{ width: 36 }} />
        </div>
      </div>

      <div style={{ padding: 16 }}>
        {/* Explanatory note */}
        <div
          style={{
            background: "#E6F1FB",
            borderRadius: 10,
            padding: "12px 14px",
            fontSize: 13,
            color: BLUE,
            lineHeight: 1.45,
            marginBottom: 16,
          }}
        >
          These terms will be shown to pupils when you send them for signature. A separate DSM platform
          terms document is managed separately.
        </div>

        {/* Last updated */}
        {lastUpdated && (
          <div
            style={{
              fontSize: 12,
              color: MUTED,
              marginBottom: 12,
              fontWeight: 500,
            }}
          >
            Last updated {lastUpdated}
            {terms?.version ? ` · Version ${terms.version}` : ""}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: MUTED, fontSize: 13 }}>Loading…</div>
        ) : (
          <>
            <label
              htmlFor="terms-content"
              style={{
                display: "block",
                fontSize: 14,
                fontWeight: 600,
                color: NAVY,
                marginBottom: 8,
              }}
            >
              Your terms
            </label>
            <textarea
              id="terms-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter your terms and conditions here. These will be shown to pupils when you send them for signature."
              style={{
                width: "100%",
                minHeight: 320,
                borderRadius: 10,
                border: `1px solid ${BORDER}`,
                padding: 14,
                fontSize: 14,
                lineHeight: 1.5,
                color: NAVY,
                background: "#fff",
                resize: "vertical",
                outline: "none",
                ...POPPINS,
              }}
            />

            <Button
              onClick={handleSave}
              disabled={saving}
              style={{
                marginTop: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <Save size={18} />
              {saving ? "Saving…" : "Save"}
            </Button>
          </>
        )}
      </div>
    </PageLayout>
  );
}

export default TermsPage;
