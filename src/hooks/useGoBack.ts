import { useCallback } from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";

/**
 * Safe "back" navigation.
 *
 * `navigate({ to: -1 })` is not supported by TanStack Router and ends up
 * resolving to a "-1" path (404). Use the router history instead, and fall
 * back to a sensible in-app route when there is no previous entry
 * (deep link, new tab, refresh).
 */
export function useGoBack() {
  const navigate = useNavigate();
  const router = useRouter();

  return useCallback(
    (fallback: string) => {
      const canGoBack =
        typeof window !== "undefined" &&
        (typeof router.history.canGoBack === "function"
          ? router.history.canGoBack()
          : window.history.length > 1);

      if (canGoBack) {
        router.history.back();
      } else {
        navigate({ to: fallback as never });
      }
    },
    [navigate, router],
  );
}
