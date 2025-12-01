import { useMemo } from "react";
import type { UserMenuOptionVM, UserProfileVM } from "@/types";

interface UserMenuProps {
  profile: UserProfileVM | null;
  isOpen: boolean;
  onToggle: () => void;
  onNavigate: (href: string) => void;
  onLogout: () => Promise<void>;
  closeMenus: () => void;
  options?: UserMenuOptionVM[];
}

export const UserMenu = ({ profile, isOpen, onToggle, onNavigate, onLogout, closeMenus, options }: UserMenuProps) => {
  const defaultOptions = useMemo<UserMenuOptionVM[]>(
    () => [
      { label: "Profil", href: "/profile", type: "link" },
      { label: "Ustawienia", href: "/settings", type: "link" },
      { label: "Wyloguj", action: onLogout, type: "action" },
    ],
    [onLogout]
  );

  const menuOptions = options ?? defaultOptions;

  const displayName = profile?.name || profile?.email || "Użytkownik";

  const handleOptionClick = async (option: UserMenuOptionVM) => {
    closeMenus();

    if (option.href) {
      onNavigate(option.href);
      return;
    }

    if (option.action) {
      await option.action();
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-800 transition hover:border-slate-300"
        onClick={onToggle}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <span className="h-7 w-7 rounded-full bg-slate-200" />
        {displayName}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-44 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
          {menuOptions.map((option) => (
            <button
              key={option.label}
              type="button"
              className="block w-full px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              onClick={() => handleOptionClick(option)}
              disabled={option.disabled}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
