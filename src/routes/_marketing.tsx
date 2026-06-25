import { createFileRoute, Outlet } from "@tanstack/react-router";
import { MarketingNav } from "../components/marketing/MarketingNav";
import { MarketingFooter } from "../components/marketing/MarketingFooter";

export const Route = createFileRoute("/_marketing")({
  component: MarketingLayout,
});

function MarketingLayout() {
  return (
    <div style={{ background: "#fff", color: "#0F172A", minHeight: "100vh", fontFamily: "Poppins, system-ui, sans-serif" }}>
      <MarketingNav />
      <Outlet />
      <MarketingFooter />
    </div>
  );
}
