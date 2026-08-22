import { createFileRoute, useNavigate } from "@tanstack/react-router";
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

  return (
    <DSMTopSheet title="DSM Learn" onBack={() => goBack("/home")}>
      <div style={{ fontFamily: FONT, minHeight: "100%", background: "#DCE4F0" }}>
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
        {active === "bitesize" && <BitesizePageBody />}
        {active === "showcase" && <ShowcasePageBody />}
      </div>
    </DSMTopSheet>
  );
}

export default DSMLearnPage;
