import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Outlet, useRouterState } from "@tanstack/react-router";
import { ChevronLeft, Star, Users, BookOpen, Settings, FileText, ShoppingBag, Video, Mic } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export const Route = createFileRoute("/admin")({
  component: AdminHub,
});

type Status = "checking" | "allowed" | "denied";

function AdminTopBar({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        background: "#1877D6",
        color: "#fff",
        padding: "calc(env(safe-area-inset-top, 0px) + 12px) 16px 14px",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <button
        type="button"
        onClick={onBack}
        aria-label="Back"
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.15)",
          border: "none",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "#fff",
        }}
      >
        <ChevronLeft size={18} />
      </button>
      <span style={{ fontSize: 16, fontWeight: 600 }}>{title}</span>
    </div>
  );
}

export function useAdminGate() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) {
        if (!cancelled) setStatus("denied");
        return;
      }
      const { data: adminRows, error: adminErr } = await supabase
        .from("admin_users")
        .select("role")
        .eq("user_id", userId)
        .limit(1);
      if (cancelled) return;
      if (adminErr) console.error("[admin] admin gate check error", adminErr);
      const adminCheck = adminRows?.[0] ?? null;
      setStatus(adminCheck ? "allowed" : "denied");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // No auto-redirect on denied — show access denied screen with actions
  // so the user isn't punted into onboarding with no escape.

  return status;
}

function AdminSectionTile({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: "#fff",
        borderWidth: "0.5px",
        borderStyle: "solid",
        borderColor: "#EEF2F7",
        borderRadius: 12,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 10,
        cursor: "pointer",
        textAlign: "left",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: "#FEECEE",
          color: "#1877D6",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#0B1F3A" }}>{label}</div>
    </button>
  );
}

function AdminHub() {
  const navigate = useNavigate();
  const status = useAdminGate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isChildRoute = pathname !== "/admin" && pathname !== "/admin/";

  // Child routes (e.g. /admin/featured) have their own admin gate and layout;
  // render the Outlet unconditionally so they mount instead of the hub.
  if (isChildRoute) return <Outlet />;

  if (status === "checking") {
    return (
      <div style={{ background: "#fff", minHeight: "100vh", padding: 24, fontFamily: "Inter, sans-serif", color: "#6B7280" }}>
        Checking access…
      </div>
    );
  }
  if (status === "denied") {
    return (
      <div style={{ background: "#fff", minHeight: "100vh", padding: 24, fontFamily: "Inter, sans-serif" }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: "#1877D6" }}>Access denied</div>
        <div style={{ color: "#6B7280", marginTop: 8 }}>
          Your account doesn't have admin access.
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <button
            type="button"
            onClick={() => navigate({ to: "/home" })}
            style={{
              flex: 1,
              height: 44,
              borderRadius: 10,
              background: "#0B1F3A",
              color: "#fff",
              border: "none",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Go to home
          </button>
          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/login" as never });
            }}
            style={{
              flex: 1,
              height: 44,
              borderRadius: 10,
              background: "#fff",
              color: "#1877D6",
              border: "1px solid #1877D6",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "#fff", minHeight: "100vh", fontFamily: "Inter, sans-serif" }}>
      <AdminTopBar title="Admin" onBack={() => navigate({ to: "/home" })} />
      <div style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 64px)" }}>
        <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <AdminSectionTile
            icon={<Star size={18} />}
            label="Featured listings"
            onClick={() => navigate({ to: "/admin/featured" })}
          />
          <AdminSectionTile
            icon={<FileText size={18} />}
            label="Applications"
            onClick={() => navigate({ to: "/admin/applications" as never })}
          />
          <AdminSectionTile
            icon={<ShoppingBag size={18} />}
            label="Marketplace listings"
            onClick={() => navigate({ to: "/admin/listings" as never })}
          />
          <AdminSectionTile
            icon={<Video size={18} />}
            label="DSM Live"
            onClick={() => navigate({ to: "/admin/dsm-live" as never })}
          />
          <AdminSectionTile
            icon={<Mic size={18} />}
            label="Podcasts"
            onClick={() => navigate({ to: "/admin/podcasts" as never })}
          />
          <AdminSectionTile
            icon={<Users size={18} />}
            label="All instructors"
            onClick={() => navigate({ to: "/admin/instructors" as never })}
          />
          <AdminSectionTile
            icon={<BookOpen size={18} />}
            label="All bookings"
            onClick={() => navigate({ to: "/admin/bookings" as never })}
          />
          <AdminSectionTile
            icon={<Settings size={18} />}
            label="Platform settings"
            onClick={() => navigate({ to: "/admin/settings" as never })}
          />
        </div>
      </div>
    </div>
  );
}
