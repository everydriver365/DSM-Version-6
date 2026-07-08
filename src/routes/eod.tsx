import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/eod")({
  beforeLoad: () => {
    throw redirect({ to: "/end-of-day" });
  },
});
