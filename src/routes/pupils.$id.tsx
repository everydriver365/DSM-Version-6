import { createFileRoute, Link } from "@tanstack/react-router";
import { BottomNav } from "../components/dsm/BottomNav";

export const Route = createFileRoute("/pupils/$id")({
  component: PupilDetailPage,
});

function PupilDetailPage() {
  const { id } = Route.useParams();
  return (
    <div
      className="min-h-screen bg-white pb-24 pb-safe"
      style={{ fontFamily: "Poppins, sans-serif" }}
    >
      <div className="px-4 pt-6">
        <Link to="/pupils" className="text-[13px] text-[#6B7280]">
          ← Back
        </Link>
        <h1 className="mt-2 text-[20px] font-semibold text-[#0F2044]">Pupil</h1>
        <p className="mt-2 text-[13px] text-[#6B7280]">ID: {id}</p>
      </div>
      <BottomNav active="pupils" />
    </div>
  );
}
