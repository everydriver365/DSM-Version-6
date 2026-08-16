import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/dsm/PageHeader";
import { useAdminGate, BenefitPartnersSection } from "./admin";

export const Route = createFileRoute("/admin/benefits")({
  component: AdminBenefits,
  head: () => ({
    meta: [
      { title: "Benefits & perks admin | Driving School Manager" },
      {
        name: "description",
        content:
          "Manage DSM benefit partners and the perks listed under each partner.",
      },
      { property: "og:title", content: "Benefits & perks admin | DSM" },
      {
        property: "og:description",
        content: "Add, edit and order benefit partners and their perks.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function AdminBenefits() {
  const navigate = useNavigate();
  const status = useAdminGate();

  useEffect(() => {
    if (status === "denied") navigate({ to: "/home" });
  }, [status, navigate]);

  if (status === "checking") {
    return (
      <div
        style={{
          background: "#fff",
          minHeight: "100vh",
          padding: 24,
          color: "#6B7280",
          fontFamily: "Poppins, sans-serif",
        }}
      >
        Checking access…
      </div>
    );
  }
  if (status === "denied") return null;

  return (
    <div
      style={{
        background: "#fff",
        minHeight: "100vh",
        fontFamily: "Poppins, sans-serif",
        paddingBottom: 40,
      }}
    >
      <PageHeader title="Benefits & perks" backTo="/admin" />
      <div style={{ paddingTop: 12 }}>
        <BenefitPartnersSection />
      </div>
    </div>
  );
}
