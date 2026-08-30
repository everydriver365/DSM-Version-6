import * as React from "react";

/**
 * Lets page-level headers (DSMTopSheet, PageHeader) tell the root layout that
 * they already render their own back arrow, so the global back chip stays
 * hidden and pages never show two.
 */
type BackBarContextValue = {
  count: number;
  register: () => () => void;
};

const BackBarContext = React.createContext<BackBarContextValue | null>(null);

export function BackBarProvider({ children }: { children: React.ReactNode }) {
  const [count, setCount] = React.useState(0);

  const register = React.useCallback(() => {
    setCount((c) => c + 1);
    return () => setCount((c) => Math.max(0, c - 1));
  }, []);

  const value = React.useMemo(() => ({ count, register }), [count, register]);

  return <BackBarContext.Provider value={value}>{children}</BackBarContext.Provider>;
}

/** Call from a header that renders its own back arrow. */
export function useRegisterPageBack(active: boolean) {
  const ctx = React.useContext(BackBarContext);
  const register = ctx?.register;
  React.useEffect(() => {
    if (!active || !register) return;
    return register();
  }, [active, register]);
}

/** True when some page-level header already shows a back arrow. */
export function usePageHasBack() {
  const ctx = React.useContext(BackBarContext);
  return (ctx?.count ?? 0) > 0;
}

export default BackBarProvider;
