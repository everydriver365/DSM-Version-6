import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { useAdminGate } from "./admin";

export const Route = createFileRoute("/admin/terms")({
  component: AdminTermsPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;
const NAVY = "#0B1F3A";
const BLUE = "#1877D6";
const GREY = "#6B7280";
const BORDER = "#E2E6ED";

interface PlatformTerms {
  id: string;
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

function AdminTermsPage() {
  const navigate = useNavigate();
  const gate = useAdminGate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [terms, setTerms] = useState<PlatformTerms | null>(null);

  useEffect(() => {
    if (gate === "denied") navigate({ to: "/home" });
  }, [gate, navigate]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("platform_terms")
      .select("id, content, version, updated_at, created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[admin/terms] failed to fetch platform terms", error);
      toast.error("Failed to load platform terms");
    } else if (data) {
      const row = data as PlatformTerms;
      setTerms(row);
      setContent(row.content ?? "");
      setOriginalContent(row.content ?? "");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (gate === "allowed") load();
  }, [gate]);

  const handleSave = async () => {
    const trimmed = content.trim();
    const changed = trimmed !== (originalContent ?? "").trim();
    const nextVersion = terms ? (changed ? (terms.version ?? 0) + 1 : terms.version ?? 1) : 1;

    setSaving(true);

    let error;
    if (terms?.id) {
      const result = await supabase
        .from("platform_terms")
        .update({ content: trimmed, version: nextVersion, updated_at: new Date().toISOString() })
        .eq("id", terms.id);
      error = result.error;
    } else {
      const result = await supabase.from("platform_terms").insert({
        content: trimmed,
        version: nextVersion,
        updated_at: new Date().toISOString(),
      });
      error = result.error;
    }

    setSaving(false);
    if (error) {
      console.error("[admin/terms] failed to save platform terms", error);
      toast.error("Failed to save platform terms");
      return;
    }

    setOriginalContent(trimmed);
    setTerms((prev) =>
      prev
        ? { ...prev, content: trimmed, version: nextVersion, updated_at: new Date().toISOString() }
        : {
            id: "",
            content: trimmed,
            version: nextVersion,
            updated_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          },
    );
    toast.success("Platform terms saved");
  };

  if (gate === "checking") {
    return (
      <div style={{ background: "#fff", minHeight: "100vh", padding: 24, ...POPPINS, color: GREY }}>
        Checking access…
      </div>
    );
  }
  if (gate === "denied") {
    return (
      <div style={{ background: "#fff", minHeight: "100vh", padding: 24, ...POPPINS }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: BLUE }}>Access denied</div>
      </div>
    );
  }

  const lastUpdated = relativeTime(terms?.updated_at ?? terms?.created_at);

  return (
    <div style={{ background: "#DCE4F0", minHeight: "100vh", ...POPPINS, paddingBottom: 32 }}>
      {/* Header */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          background: NAVY,
          color: "#fff",
          padding: "calc(env(safe-area-inset-top, 0px) + 12px) 16px 14px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <button
          type="button"
          onClick={() => navigate({ to: "/admin" })}
          aria-label="Back"
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.15)",
            border: "none",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "#fff",
          }}
        >
          <ChevronLeft size={18} />
        </button>
        <span style={{ fontSize: 16, fontWeight: 600, flex: 1 }}>Platform terms</span>
      </div>

      <div style={{ padding: 16 }}>
        {lastUpdated && (
          <div
            style={{
              fontSize: 12,
              color: GREY,
              marginBottom: 12,
              fontWeight: 500,
            }}
          >
            Last updated {lastUpdated}
            {terms?.version ? ` · Version ${terms.version}` : ""}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: GREY, fontSize: 13 }}>Loading…</div>
        ) : (
          <>
            <label
              htmlFor="platform-terms-content"
              style={{
                display: "block",
                fontSize: 14,
                fontWeight: 600,
                color: NAVY,
                marginBottom: 8,
              }}
            >
              Platform terms & conditions
            </label>
            <textarea
              id="platform-terms-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter the platform terms and conditions here. These apply to all users of DSM."
              style={{
                width: "100%",
                minHeight: 360,
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

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{
                width: "100%",
                height: 44,
                borderRadius: 10,
                background: BLUE,
                color: "#fff",
                border: "none",
                fontWeight: 600,
                cursor: "pointer",
                opacity: saving ? 0.7 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                marginTop: 16,
                ...POPPINS,
              }}
            >
              <Save size={18} />
              {saving ? "Saving…" : "Save"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default AdminTermsPage;
