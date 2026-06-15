import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BottomNav } from "../components/dsm/BottomNav";
import { Card } from "../components/dsm/Card";
import { Button } from "../components/dsm/Button";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — DSM by EveryDriver" },
      { name: "description", content: "Manage your account and preferences." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }
  return (
    <div className="min-h-screen bg-white pb-20" style={{ fontFamily: "Poppins, sans-serif" }}>
      <div className="px-4 pt-6">
        <h1 className="text-[20px] font-semibold text-[#0F2044]">Settings</h1>
        <div className="mt-4 flex flex-col gap-4">
          <Card>
            <p className="text-[14px] text-[#1A1A2E]">Coming soon</p>
            <p className="mt-1 text-[13px] text-[#6B7280]">
              Account and app preferences will appear here.
            </p>
          </Card>
          <Button variant="destructive" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </div>
      <BottomNav active="settings" />
    </div>
  );
}
