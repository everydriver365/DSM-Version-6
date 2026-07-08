import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import {
  HomeIcon,
  PupilsIcon,
  ScheduleIcon,
  MessagesIcon,
  PaymentsIcon,
  SettingsIcon,
} from "@/components/icons/DrivingIcons";
import {
  Receipt,
  StickyNote,
  Inbox,
  Fuel,
  Car,
  BookOpen,
  BarChart3,
  PoundSterling,
  MapPin,
  Plus,
  Search as SearchIcon,
  Percent,
  ClipboardList,
  ShieldCheck,
  Bell,
  HelpCircle,
  Users,
} from "lucide-react";

import { supabase } from "@/lib/supabaseClient";
import { haptic } from "@/lib/haptics";

type Nav = { label: string; route: string; icon: React.ComponentType<{ size?: number }>; keywords?: string };

const NAV: Nav[] = [
  { label: "Home", route: "/home", icon: HomeIcon },
  { label: "Pupils", route: "/pupils", icon: PupilsIcon },
  { label: "Schedule", route: "/schedule", icon: ScheduleIcon },
  { label: "Messages", route: "/messages", icon: MessagesIcon },
  { label: "Payments", route: "/payments", icon: PaymentsIcon },
  { label: "Expenses", route: "/expenses", icon: Receipt },
  { label: "Notes", route: "/notes", icon: StickyNote },
  { label: "Enquiries", route: "/enquiries", icon: Inbox },
  { label: "Mileage", route: "/mileage", icon: MapPin },
  { label: "Fuel", route: "/fuel", icon: Fuel },
  { label: "Vehicle", route: "/vehicle", icon: Car },
  { label: "CPD", route: "/cpd", icon: BookOpen, keywords: "learning training" },
  { label: "Reports", route: "/reports", icon: BarChart3 },
  { label: "Earnings", route: "/earnings", icon: PoundSterling },
  { label: "Tax report", route: "/tax-report", icon: BarChart3 },
  { label: "Discount codes", route: "/discount-codes", icon: Percent },
  { label: "Intake questions", route: "/intake-questions", icon: ClipboardList },
  { label: "Waivers", route: "/waivers", icon: ShieldCheck },
  { label: "Notifications", route: "/notifications", icon: Bell },
  { label: "Help", route: "/help", icon: HelpCircle },
  { label: "Settings", route: "/settings", icon: SettingsIcon },
];


const ACTIONS: Nav[] = [
  { label: "New lesson", route: "/lessons/new", icon: Plus },
  { label: "New pupil", route: "/pupils/new", icon: Plus },
  { label: "New note", route: "/notes", icon: Plus },
  { label: "New quote", route: "/quotes/new", icon: Plus },
  { label: "Take payment", route: "/take-payment", icon: Plus },
];

type PupilHit = { id: string; name: string };

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [pupils, setPupils] = useState<PupilHit[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const reqRef = useRef(0);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        haptic("selection");
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) setUserId(data.user.id);
    })();
  }, [open]);

  useEffect(() => {
    const h = window.setTimeout(() => setDebounced(query.trim()), 200);
    return () => window.clearTimeout(h);
  }, [query]);

  useEffect(() => {
    if (!open || !userId || !debounced) {
      setPupils([]);
      return;
    }
    const my = ++reqRef.current;
    const pattern = `%${debounced.replace(/[%,]/g, " ")}%`;
    (async () => {
      const res = await supabase
        .from("pupils")
        .select("id, name, first_name, last_name")
        .eq("instructor_id", userId)
        .is("deleted_at", null)
        .or(
          `name.ilike.${pattern},first_name.ilike.${pattern},last_name.ilike.${pattern}`,
        )
        .limit(6);
      if (my !== reqRef.current) return;
      const hits: PupilHit[] = (res.data ?? []).map((p: any) => ({
        id: p.id,
        name:
          (p.name && String(p.name).trim()) ||
          `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() ||
          "Unnamed",
      }));
      setPupils(hits);
    })();
  }, [debounced, open, userId]);

  function go(route: string, params?: Record<string, string>) {
    setOpen(false);
    setQuery("");
    haptic("tap");
    if (params) {
      // dynamic route
      navigate({ to: route as any, params } as any);
    } else {
      navigate({ to: route });
    }
  }

  const navFiltered = useMemo(() => NAV, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search pupils, jump to a page, or run an action..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>

        {pupils.length > 0 && (
          <CommandGroup heading="Pupils">
            {pupils.map((p) => (
              <CommandItem
                key={p.id}
                value={`pupil ${p.name}`}
                onSelect={() => go("/pupils/$id", { id: p.id })}
              >
                <Users />
                <span>{p.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandGroup heading="Quick actions">
          {ACTIONS.map((a) => {
            const Icon = a.icon;
            return (
              <CommandItem
                key={a.route + a.label}
                value={`action ${a.label}`}
                onSelect={() => go(a.route)}
              >
                <Icon />
                <span>{a.label}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandGroup heading="Jump to">
          {navFiltered.map((n) => {
            const Icon = n.icon;
            return (
              <CommandItem
                key={n.route}
                value={`${n.label} ${n.keywords ?? ""}`}
                onSelect={() => go(n.route)}
              >
                <Icon />
                <span>{n.label}</span>
                <span className="ml-auto text-xs text-muted-foreground">{n.route}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>

        {debounced && (
          <CommandGroup heading="Search">
            <CommandItem
              value={`search ${debounced}`}
              onSelect={() => go("/search")}
            >
              <SearchIcon />
              <span>Search everything for "{debounced}"</span>
            </CommandItem>
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}