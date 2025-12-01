import { useCallback, useMemo, useState } from "react";
import type { BreadcrumbEntry, NavbarState } from "@/types";

export const useNavbarState = (initialPath = "/") => {
  const [state, setState] = useState<NavbarState>({
    activePath: initialPath,
    isMobileMenuOpen: false,
    isUserMenuOpen: false,
    breadcrumbs: [],
  });

  const setActivePath = useCallback((path: string) => {
    setState((prev) => ({ ...prev, activePath: path }));
  }, []);

  const setBreadcrumbs = useCallback((entries: BreadcrumbEntry[]) => {
    setState((prev) => ({ ...prev, breadcrumbs: entries }));
  }, []);

  const toggleMobileMenu = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isMobileMenuOpen: !prev.isMobileMenuOpen,
      isUserMenuOpen: false,
    }));
  }, []);

  const toggleUserMenu = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isUserMenuOpen: !prev.isUserMenuOpen,
      isMobileMenuOpen: false,
    }));
  }, []);

  const closeMenus = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isMobileMenuOpen: false,
      isUserMenuOpen: false,
    }));
  }, []);

  const memoizedState = useMemo(() => state, [state]);

  return {
    state: memoizedState,
    setActivePath,
    setBreadcrumbs,
    toggleMobileMenu,
    toggleUserMenu,
    closeMenus,
  };
};
