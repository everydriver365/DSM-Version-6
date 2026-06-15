import { createFileRoute } from "@tanstack/react-router";
import { BottomNav } from "../components/dsm/BottomNav";
import { Card } from "../components/dsm/Card";

export const Route = createFileRoute("/pupils")({
  head: () => ({
    meta: [
      { title: "Pupils — DSM by EveryDriver" },
      { name: "description", content: "Manage your pupils and their progress." },
    ],
  }),
  component: PupilsPage,
});

function PupilsPage() {
  return (
    <div className="min-h-screen bg-white pb-20" style={{ fontFamily: "Poppins, sans-serif" }}>
      <div className="px-4 pt-6">
        <h1 className="text-[20px] font-semibold text-[#0F2044]">Pupils</h1>
        <div className="mt-4">
          <Card>
            <p className="text-[14px] text-[#1A1A2E]">Coming soon</p>
            <p className="mt-1 text-[13px] text-[#6B7280]">
              Your pupils list will appear here.
            </p>
          </Card>
        </div>
      </div>
      <BottomNav active="pupils" />
    </div>
  );
}
