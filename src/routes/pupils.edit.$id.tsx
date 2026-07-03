import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/pupils/edit/$id")({
  component: PupilEditRedirect,
});

function PupilEditRedirect() {
  const navigate = useNavigate();
  const { id } = Route.useParams();
  useEffect(() => {
    navigate({ to: "/pupils/$id", params: { id }, replace: true });
  }, []);
  return null;
}
