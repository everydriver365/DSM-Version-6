import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BottomNav } from "../components/dsm/BottomNav";
import { Card } from "../components/dsm/Card";
import { Button } from "../components/dsm/Button";
import { Input } from "../components/dsm/Input";
import { SectionHeader } from "../components/dsm/SectionHeader";
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

type EditField = "display_name" | "phone" | null;

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
type Day = (typeof DAYS)[number];

function SettingsPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [editing, setEditing] = useState<EditField>(null);
  const [draft, setDraft] = useState<string>("");
  const [workingDays, setWorkingDays] = useState<Record<Day, boolean>>(() =>
    DAYS.reduce((acc, d) => ({ ...acc, [d]: true }), {} as Record<Day, boolean>),
  );

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return;
      setUserId(user.id);
      setEmail(user.email ?? "");
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, phone")
        .eq("id", user.id)
        .maybeSingle();
      if (profile) {
        setDisplayName(profile.display_name ?? "");
        setPhone(profile.phone ?? "");
      }
    })();
  }, []);

  function openEdit(field: Exclude<EditField, null>) {
    setEditing(field);
    setDraft(field === "display_name" ? displayName : phone);
  }

  async function saveEdit() {
    if (!userId || !editing) return;
    const patch =
      editing === "display_name" ? { display_name: draft } : { phone: draft };
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: userId, ...patch, updated_at: new Date().toISOString() });
    if (error) return;
    if (editing === "display_name") setDisplayName(draft);
    else setPhone(draft);
    setEditing(null);
  }

  function toggleDay(d: Day) {
    setWorkingDays((prev) => ({ ...prev, [d]: !prev[d] }));
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  const rowDivider = {
    borderTopWidth: "0.5px",
    borderTopStyle: "solid" as const,
    borderTopColor: "#E2E6ED",
  };

  function renderEditableRow(
    field: Exclude<EditField, null>,
    label: string,
    value: string,
    placeholder: string,
    isFirst: boolean,
  ) {
    const open = editing === field;
    return (
      <div style={isFirst ? undefined : rowDivider}>
        <button
          type="button"
          onClick={() => (open ? setEditing(null) : openEdit(field))}
          className="w-full flex items-center justify-between py-3 text-left"
        >
          <span className="text-[14px] text-[#0F2044]">{label}</span>
          <span className="text-[14px] text-[#6B7280] truncate ml-3">
            {value || "—"}
          </span>
        </button>
        {open && (
          <div className="pb-3 flex flex-col gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={placeholder}
              autoFocus
            />
            <Button inline onClick={saveEdit} className="self-end">
              Save
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-white pb-24 pb-safe"
      style={{ fontFamily: "Poppins, sans-serif" }}
    >
      <div className="px-4 pt-6">
        <p
          className="text-[20px] font-semibold"
          style={{ color: "#0F2044", fontFamily: "Poppins, sans-serif" }}
        >
          Settings
        </p>

        <SectionHeader>Profile</SectionHeader>
        <Card className="!p-0">
          <div className="px-4">
            {renderEditableRow(
              "display_name",
              "Display name",
              displayName,
              "Your name",
              true,
            )}
            <div style={rowDivider}>
              <div className="flex items-center justify-between py-3">
                <span className="text-[14px] text-[#0F2044]">Email</span>
                <span className="text-[14px] text-[#6B7280] truncate ml-3">
                  {email || "—"}
                </span>
              </div>
            </div>
            {renderEditableRow("phone", "Phone number", phone, "07…", false)}
          </div>
        </Card>

        <SectionHeader>Working hours</SectionHeader>
        <Card className="!p-0">
          <div className="px-4">
            {DAYS.map((d, i) => {
              const on = workingDays[d];
              return (
                <div
                  key={d}
                  className="flex items-center justify-between py-3"
                  style={i === 0 ? undefined : rowDivider}
                >
                  <span className="text-[14px] text-[#0F2044]">{d}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    aria-label={`${d} working hours`}
                    onClick={() => toggleDay(d)}
                    className="relative inline-flex items-center rounded-full transition-colors"
                    style={{
                      width: 40,
                      height: 22,
                      backgroundColor: on ? "#1A52A0" : "#E2E6ED",
                    }}
                  >
                    <span
                      className="inline-block rounded-full bg-white transition-transform"
                      style={{
                        width: 18,
                        height: 18,
                        transform: `translateX(${on ? 20 : 2}px)`,
                      }}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </Card>

        <SectionHeader>Account</SectionHeader>
        <Button variant="destructive" onClick={signOut}>
          Sign out
        </Button>
      </div>

      <BottomNav active="settings" />
    </div>
  );
}
