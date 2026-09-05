import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { IconUpload, IconVideo } from "@tabler/icons-react";
import { PageHeader } from "@/components/dsm/PageHeader";
import { supabase } from "@/lib/supabaseClient";
import { uploadVideo } from "@/lib/uploadFile";
import { toast } from "@/lib/toast";
import { tokens } from "@/lib/tokens";
import { useAdminGate } from "./admin";

export const Route = createFileRoute("/admin/pro-videos")({
  head: () => ({
    meta: [
      { title: "PRO page explainer videos — EDP Admin" },
      {
        name: "description",
        content:
          "Add a YouTube, Vimeo or uploaded explainer video to each section of the EveryDriver PRO page.",
      },
      { property: "og:title", content: "PRO page explainer videos — EDP Admin" },
      {
        property: "og:description",
        content: "Manage the explainer video shown on each PRO page section.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminProVideos,
});

export const PRO_VIDEO_SECTIONS: { key: string; label: string }[] = [
  { key: "intro", label: "PRO intro" },
  { key: "dia", label: "DIA membership" },
  { key: "website", label: "Free website" },
  { key: "perks", label: "PRO Perks" },
  { key: "media", label: "PRO Media Hub" },
  { key: "pricing", label: "Membership pricing" },
  { key: "tracking", label: "EDP Tracking" },
  { key: "addons", label: "Add-ons" },
];

type Row = { section: string; title: string | null; video_url: string | null };

function AdminProVideos() {
  const navigate = useNavigate();
  const status = useAdminGate();
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("pro_section_videos")
        .select("section, title, video_url");
      if (error) console.error("[admin] pro_section_videos load", error);
      const map: Record<string, Row> = {};
      for (const s of PRO_VIDEO_SECTIONS) {
        map[s.key] = { section: s.key, title: null, video_url: null };
      }
      for (const r of (data as Row[]) ?? []) {
        map[r.section] = {
          section: r.section,
          title: r.title ?? null,
          video_url: r.video_url ?? null,
        };
      }
      setRows(map);
      setLoading(false);
    })();
  }, []);

  function update(key: string, patch: Partial<Row>) {
    setRows((prev) => ({ ...prev, [key]: { ...prev[key], section: key, ...patch } }));
  }

  async function save(key: string) {
    setSavingKey(key);
    try {
      const row = rows[key];
      const { error } = await supabase.from("pro_section_videos").upsert(
        {
          section: key,
          title: row?.title?.trim() || null,
          video_url: row?.video_url?.trim() || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "section" },
      );
      if (error) throw error;
      toast.success("Saved");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save");
    } finally {
      setSavingKey(null);
    }
  }

  async function onUpload(key: string, file: File | undefined) {
    if (!file) return;
    setUploadingKey(key);
    try {
      const url = await uploadVideo(file, "learn-videos");
      update(key, { video_url: url });
      toast.success("Video uploaded — remember to save");
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    } finally {
      setUploadingKey(null);
    }
  }

  if (status === "checking") {
    return (
      <div style={{ padding: 24, fontFamily: "Poppins, sans-serif", color: "#6B7280" }}>
        Checking access…
      </div>
    );
  }
  if (status === "denied") {
    return (
      <div style={{ padding: 24, fontFamily: "Poppins, sans-serif" }}>
        Your account doesn't have admin access.
      </div>
    );
  }

  return (
    <div style={{ background: "#DCE4F0", minHeight: "100vh", fontFamily: "Poppins, sans-serif" }}>
      <PageHeader title="PRO page videos" onBack={() => navigate({ to: "/admin" })} />
      <div style={{ padding: "16px 16px 120px" }}>
        <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 14 }}>
          Add a YouTube or Vimeo link, or upload a video file. Each section on the PRO page will
          show a “Watch explainer” button when a video is set.
        </div>

        {loading ? (
          <div style={{ color: "#6B7280" }}>Loading…</div>
        ) : (
          PRO_VIDEO_SECTIONS.map((s) => {
            const row = rows[s.key];
            return (
              <div
                key={s.key}
                style={{
                  background: "#fff",
                  borderRadius: 14,
                  padding: 14,
                  marginBottom: 12,
                  border: "1px solid #E4E8EF",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontWeight: 700,
                    color: tokens.navy,
                    marginBottom: 10,
                  }}
                >
                  <IconVideo size={18} color={tokens.blue} />
                  {s.label}
                </div>

                <input
                  value={row?.title ?? ""}
                  onChange={(e) => update(s.key, { title: e.target.value })}
                  placeholder="Video title (optional)"
                  style={inputStyle}
                />
                <input
                  value={row?.video_url ?? ""}
                  onChange={(e) => update(s.key, { video_url: e.target.value })}
                  placeholder="YouTube / Vimeo URL or uploaded file URL"
                  style={inputStyle}
                />

                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <label
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      background: "#F3F6FB",
                      color: tokens.blue,
                      borderRadius: 10,
                      padding: "9px 12px",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    <IconUpload size={16} />
                    {uploadingKey === s.key ? "Uploading…" : "Upload video"}
                    <input
                      type="file"
                      accept="video/*"
                      hidden
                      onChange={(e) => onUpload(s.key, e.target.files?.[0])}
                    />
                  </label>

                  {row?.video_url && (
                    <button
                      type="button"
                      onClick={() => update(s.key, { video_url: "" })}
                      style={{
                        background: "#FEF2F2",
                        color: tokens.red,
                        border: "none",
                        borderRadius: 10,
                        padding: "9px 12px",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: "Poppins, sans-serif",
                      }}
                    >
                      Remove
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => save(s.key)}
                    disabled={savingKey === s.key}
                    style={{
                      marginLeft: "auto",
                      background: tokens.blue,
                      color: "#fff",
                      border: "none",
                      borderRadius: 10,
                      padding: "9px 16px",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "Poppins, sans-serif",
                    }}
                  >
                    {savingKey === s.key ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #E4E8EF",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 14,
  fontFamily: "Poppins, sans-serif",
  width: "100%",
  outline: "none",
  marginBottom: 10,
  boxSizing: "border-box",
};
