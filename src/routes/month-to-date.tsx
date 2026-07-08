import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/month-to-date")({
  beforeLoad: () => {
    throw redirect({ to: "/mtd" });
  },
});
