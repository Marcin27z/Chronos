import { useCallback, useEffect, useMemo } from "react";
import type { BreadcrumbEntry, NavItemDTO, UserMenuOptionVM, UserProfileVM } from "@/types";
import { useNavbarState } from "@/lib/hooks/useNavbarState";
import { useResponsiveNav } from "@/lib/hooks/useResponsiveNav";
import { Breadcrumbs } from "./Breadcrumbs";
import { DesktopNavItems } from "./DesktopNavItems";
import { LogoLink } from "./LogoLink";
import { MobileMenu } from "./MobileMenu";
import { MobileMenuTrigger } from "./MobileMenuTrigger";
import { UserMenu } from "./UserMenu";

export interface NavbarProps {
  navItems: NavItemDTO[];
  breadcrumbs?: BreadcrumbEntry[];
  userProfile: UserProfileVM | null;
}

export const Navbar = ({ navItems, breadcrumbs = [], userProfile }: NavbarProps) => {
  const {
    state: navbarState,
    setActivePath,
    setBreadcrumbs,
    toggleMobileMenu,
    toggleUserMenu,
    closeMenus,
  } = useNavbarState();

  const isDesktop = useResponsiveNav();

  useEffect(() => {
    if (typeof window === "undefined") return;
    setActivePath(window.location.pathname);
  }, [setActivePath]);

  useEffect(() => {
    setBreadcrumbs(breadcrumbs);
  }, [breadcrumbs, setBreadcrumbs]);

  const handleNavigate = useCallback(
    (href: string) => {
      closeMenus();

      if (typeof window === "undefined") return;

      window.location.assign(href);
    },
    [closeMenus]
  );

  const visibleNavItems = useMemo(() => navItems.filter((item) => item.visible !== false), [navItems]);

  const userMenuOptions = useMemo<UserMenuOptionVM[]>(
    () => [
      { label: "Profil", href: "/profile", type: "link" },
      { label: "Ustawienia", href: "/settings", type: "link" },
      { label: "Wyloguj", type: "action" },
    ],
    []
  );

  const handleUserOptionAction = useCallback(
    async (option: UserMenuOptionVM) => {
      if (option.href) {
        handleNavigate(option.href);
        return;
      }

      if (option.action) {
        await option.action();
      }
    },
    [handleNavigate]
  );

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur backdrop-saturate-150 shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <div className="flex items-center gap-3">
          <LogoLink />
        </div>

        <div className="flex-1">
          <Breadcrumbs entries={navbarState.breadcrumbs} onNavigate={handleNavigate} />
        </div>

        <DesktopNavItems items={visibleNavItems} onNavigate={handleNavigate} activePath={navbarState.activePath} />

        <div className="flex items-center gap-3">
          <UserMenu
            profile={userProfile}
            isOpen={navbarState.isUserMenuOpen}
            onToggle={toggleUserMenu}
            onNavigate={handleNavigate}
            onLogout={() => Promise.resolve()}
            closeMenus={closeMenus}
            options={userMenuOptions}
          />

          {!isDesktop && (
            <>
              <MobileMenu
                isOpen={navbarState.isMobileMenuOpen}
                items={visibleNavItems}
                activePath={navbarState.activePath}
                userOptions={userMenuOptions}
                onNavigate={handleNavigate}
                onOptionAction={handleUserOptionAction}
                onClose={closeMenus}
              />
              <MobileMenuTrigger isOpen={navbarState.isMobileMenuOpen} onToggle={toggleMobileMenu} />
            </>
          )}
        </div>
      </div>
    </header>
  );
};
