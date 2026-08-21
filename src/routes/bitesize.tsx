import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/bitesize")({
  beforeLoad: () => {
    throw redirect({ to: "/dsm-learn", search: { tab: "bitesize" } });
  },
});
