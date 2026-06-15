import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/pupils")({
  component: PupilsLayout,
});

function PupilsLayout() {
  return <Outlet />;
}
