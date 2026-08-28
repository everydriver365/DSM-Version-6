import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { tapLight } from "@/lib/haptics";
import { supabase } from "@/lib/supabaseClient";
import { useGoBack } from "@/hooks/useGoBack";
import DSMTopSheet from "@/components/dsm/DSMTopSheet";
import SegmentedTabs from "@/components/learn/shared/SegmentedTabs";
import LearnPageBody from "@/components/learn/LearnPageBody";
import BitesizePageBody from "@/components/learn/BitesizePageBody";
import ShowcasePageBody from "@/components/learn/ShowcasePageBody";

type LearnTab = "learn" | "bitesize" | "showcase";

export const Route = createFileRoute("/dsm-learn")({
  validateSearch: (search: Record<string, unknown>): { tab?: LearnTab } => {
    const t = search.tab;
    return t === "learn" || t === "bitesize" || t === "showcase" ? { tab: t } : {};
  },
  head: () => ({
    meta: [
      { title: "EDP Learn — Guides, Bitesize and Showcase" },
      {
        name: "description",
        content:
          "Training guides, bitesize CPD videos and community showcase clips for driving instructors, all in one place.",
      },
      { property: "og:title", content: "EDP Learn — Guides, Bitesize and Showcase" },
      {
        property: "og:description",
        content:
          "Training guides, bitesize CPD videos and community showcase clips for driving instructors.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DSMLearnPage,
});

const FONT = "Poppins, sans-serif";

const TABS: { id: LearnTab; label: string }[] = [
  { id: "learn", label: "Learn" },
  { id: "bitesize", label: "Bitesize" },
  { id: "showcase", label: "Showcase" },
];

function DSMLearnPage() {
  const navigate = useNavigate();
  const goBack = useGoBack();
  const { tab } = Route.useSearch();
  const active: LearnTab = tab ?? "learn";

  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [uploadRequest, setUploadRequest] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [userId]);

  // Showcase: always visible. Bitesize: admins only. Learn: never.
  const showUpload = active === "showcase" || (active === "bitesize" && isAdmin);

  const headerRight = showUpload ? (
    <div style={{ display: "flex", alignItems: "center", gap: 14, height: 40 }}>
      <button
        type="button"
        aria-label="Upload"
        onClick={() => {
          tapLight();
          setUploadRequest((n) => n + 1);
        }}
        style={{
          background: "none",
          border: 0,
          padding: 0,
          color: "#fff",
          fontSize: 14,
          fontWeight: 500,
          cursor: "pointer",
          fontFamily: FONT,
        }}
      >
        + Upload
      </button>
    </div>
  ) : null;

  return (
    <DSMTopSheet title="DSM Learn" onBack={() => goBack("/home")} right={headerRight}>
      <div style={{ fontFamily: FONT, minHeight: "100%", background: "#DCE4F0", marginTop: -20 }}>
        <div style={{ padding: "12px 16px 4px" }}>
          <SegmentedTabs
            tabs={TABS}
            active={active}
            onChange={(id) =>
              navigate({ to: "/dsm-learn", search: { tab: id }, replace: true })
            }
          />
        </div>

        {active === "learn" && <LearnPageBody />}
        {active === "bitesize" && <BitesizePageBody uploadRequest={uploadRequest} />}
        {active === "showcase" && <ShowcasePageBody uploadRequest={uploadRequest} />}
      </div>
    </DSMTopSheet>
  );
}

export default DSMLearnPage;
