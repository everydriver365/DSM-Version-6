import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useGoBack } from "@/hooks/useGoBack";
import { tokens } from "@/lib/tokens";
import DSMTopSheet from "@/components/dsm/DSMTopSheet";
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
      { title: "DSM Learn — Guides, Bitesize and Showcase" },
      {
        name: "description",
        content:
          "Training guides, bitesize CPD videos and community showcase clips for driving instructors, all in one place.",
      },
      { property: "og:title", content: "DSM Learn — Guides, Bitesize and Showcase" },
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

const NAVY = "#0B1F3A";
const HAIRLINE = "#E2E8F0";
const FONT = "Poppins, sans-serif";
const SHADOW = "0 1px 3px rgba(0,0,0,0.06)";

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

  return (
    <DSMTopSheet title="DSM Learn" onBack={() => goBack("/home")}>
      <div style={{ fontFamily: FONT, minHeight: "100%", background: "#DCE4F0" }}>
        <div style={{ display: "flex", gap: 6, padding: "12px 16px 4px" }}>
          {TABS.map((t) => {
            const isActive = active === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => navigate({ to: "/dsm-learn", search: { tab: t.id }, replace: true })}
                style={{
                  flex: 1,
                  padding: "11px 12px",
                  borderRadius: tokens.radiusCard,
                  background: isActive ? NAVY : "#FFFFFF",
                  color: isActive ? "#FFFFFF" : NAVY,
                  fontFamily: FONT,
                  fontSize: tokens.fontSize.base,
                  fontWeight: tokens.fontWeight.semibold,
                  cursor: "pointer",
                  boxShadow: isActive ? "none" : SHADOW,
                  borderWidth: isActive ? 0 : 1,
                  borderStyle: "solid",
                  borderColor: isActive ? "transparent" : HAIRLINE,
                  transition: "background 0.15s, color 0.15s",
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {active === "learn" && <LearnPageBody />}
        {active === "bitesize" && <BitesizePageBody />}
        {active === "showcase" && <ShowcasePageBody />}
      </div>
    </DSMTopSheet>
  );
}

export default DSMLearnPage;
