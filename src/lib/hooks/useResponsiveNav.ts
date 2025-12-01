import { useEffect, useMemo, useState } from "react";

export const useResponsiveNav = (breakpoint = 768) => {
  const isClient = typeof window !== "undefined";

  const [isDesktop, setIsDesktop] = useState(() => {
    if (!isClient) return false;
    return window.matchMedia(`(min-width: ${breakpoint}px)`).matches;
  });

  useEffect(() => {
    if (!isClient) return undefined;

    const mediaQuery = window.matchMedia(`(min-width: ${breakpoint}px)`);

    const handleChange = (event: MediaQueryListEvent) => {
      setIsDesktop(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [breakpoint, isClient]);

  return useMemo(() => isDesktop, [isDesktop]);
};
