import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BottomNav } from "../components/dsm/BottomNav";
import { Card } from "../components/dsm/Card";
import { StatTile } from "../components/dsm/StatTile";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "Home — DSM by EveryDriver" },
      { name: "description", content: "Your daily overview of lessons, pupils and messages." },
    ],
  }),
  component: HomePage,
});

const upcoming = [
  { name: "Sarah Mitchell", time: "09:00" },
  { name: "James O'Connor", time: "14:30" },
];

function HomePage() {
  const [firstName, setFirstName] = useState("there");

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata as { first_name?: string; full_name?: string } | undefined;
      const name =
        meta?.first_name ??
        meta?.full_name?.split(" ")[0] ??
        data.user?.email?.split("@")[0] ??
        "there";
      setFirstName(capitalize(name));
    });
  }, []);

  return (
    <div
      className="min-h-screen bg-white pb-24 pb-safe"
      style={{ fontFamily: "Poppins, sans-serif" }}
    >
      <div className="px-4 pt-6">
        <h1 className="text-[20px] font-semibold text-[#0F2044]">
          Good morning, {firstName}
        </h1>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <StatTile value="3" label="Today's lessons" />
          <StatTile value="14" label="This week" />
          <StatTile value="£240" label="Unpaid" />
          <StatTile value="2" label="Messages" />
        </div>

        <SectionHeader>Upcoming lessons</SectionHeader>
        <Card>
          <ul className="flex flex-col divide-y" style={{ borderColor: "#E2E6ED" }}>
            {upcoming.map((l, i) => (
              <li
                key={l.name}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                style={i === 0 ? undefined : { borderTopWidth: "0.5px", borderTopColor: "#E2E6ED", borderTopStyle: "solid" }}
              >
                <span className="text-[14px] text-[#1A1A2E]">{l.name}</span>
                <span className="text-[13px] text-[#6B7280]">{l.time}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <BottomNav active="home" />
    </div>
  );
}
