import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/weeklyreport")({
  beforeLoad: () => {
    throw redirect({ to: "/weekly-report" });
  },
});
