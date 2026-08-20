import { useCallback, useRef, useState } from "react";

interface Options {
  onRefresh: () => Promise<void> | void;
  /** Minimum pull distance (px) before a refresh fires. */
  threshold?: number;
}

/**
 * Lightweight pull-to-refresh for DSM pages.
 * Spread `pullToRefreshProps` onto the scrollable container of a page.
 */
export function usePullToRefresh({ onRefresh, threshold = 70 }: Options) {
  const startY = useRef<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const atTop = (el: HTMLElement | null) => {
    if (el && el.scrollTop > 0) return false;
    // Walk up for the nearest scrolled ancestor.
    let node: HTMLElement | null = el;
    while (node) {
      if (node.scrollTop > 0) return false;
      node = node.parentElement;
    }
    return (window.scrollY || document.documentElement.scrollTop || 0) <= 0;
  };

  const onTouchStart = useCallback((e: React.TouchEvent<HTMLElement>) => {
    if (isRefreshing) return;
    if (!atTop(e.currentTarget as HTMLElement)) {
      startY.current = null;
      return;
    }
    startY.current = e.touches[0]?.clientY ?? null;
  }, [isRefreshing]);

  const onTouchMove = useCallback((e: React.TouchEvent<HTMLElement>) => {
    if (startY.current === null || isRefreshing) return;
    const dy = (e.touches[0]?.clientY ?? 0) - startY.current;
    setPullDistance(dy > 0 ? Math.min(dy, threshold * 1.5) : 0);
  }, [isRefreshing, threshold]);

  const onTouchEnd = useCallback(async () => {
    const pulled = pullDistance;
    startY.current = null;
    setPullDistance(0);
    if (pulled < threshold || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } catch (err) {
      console.error("[pull-to-refresh]", err);
    } finally {
      setIsRefreshing(false);
    }
  }, [pullDistance, threshold, isRefreshing, onRefresh]);

  return {
    isRefreshing,
    pullDistance,
    pullToRefreshProps: { onTouchStart, onTouchMove, onTouchEnd },
  };
}

export default usePullToRefresh;
