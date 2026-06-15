import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { BottomNav } from "../components/dsm/BottomNav";
import { Card } from "../components/dsm/Card";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/pupils/")({
  head: () => ({
    meta: [
      { title: "Pupils — DSM by EveryDriver" },
      { name: "description", content: "Manage your pupils and their lesson history." },
    ],
  }),
  component: PupilsIndexPage,
});

interface Pupil {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  lesson_count: number;
  balance_owed: number;
  status: string;
}

function PupilsIndexPage() {
  const [pupils, setPupils] = useState<Pupil[] | null>(null);

  useEffect(() => {
    supabase
      .from("pupils")
      .select("id, first_name, last_name, phone, email, lesson_count, balance_owed, status")
      .order("first_name", { ascending: true })
      .then(({ data }) => setPupils(data ?? []));
  }, []);

  return (
    <div
      className="min-h-screen bg-white pb-24 pb-safe relative"
      style={{ fontFamily: "Poppins, sans-serif" }}
    >
      <div className="px-4 pt-6">
        <p
          className="text-[20px] font-semibold"
          style={{ color: "#0F2044", fontFamily: "Poppins, sans-serif" }}
        >
          Pupils
        </p>

        <SectionHeader>Your pupils</SectionHeader>

        {pupils === null ? null : pupils.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-[14px] text-[#6B7280]">No pupils yet</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {pupils.map((p) => {
              const isActive = p.status === "active";
              return (
                <Link
                  key={p.id}
                  to="/pupils/$id"
                  params={{ id: p.id }}
                  className="block"
                >
                  <Card>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[14px] font-semibold text-[#0F2044] truncate">
                          {p.first_name} {p.last_name}
                        </div>
                        <div className="text-[13px] text-[#6B7280] truncate">
                          {p.phone ?? ""}
                        </div>
                      </div>
                      <span
                        className="text-[11px] text-white px-2 py-1 rounded-full shrink-0"
                        style={{
                          backgroundColor: isActive ? "#16A34A" : "#6B7280",
                        }}
                      >
                        {isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <Link
        to="/pupils/new"
        aria-label="Add pupil"
        className="fixed z-50 flex items-center justify-center rounded-full"
        style={{
          width: 52,
          height: 52,
          backgroundColor: "#1A52A0",
          color: "#FFFFFF",
          right: 16,
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)",
        }}
      >
        <Plus size={24} color="#FFFFFF" />
      </Link>

      <BottomNav active="pupils" />
    </div>
  );
}
