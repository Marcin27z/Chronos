import { useMemo } from "react";
import type { NavItemDTO, UserMenuOptionVM } from "@/types";
import { NavItem } from "./NavItem";

interface MobileMenuProps {
  isOpen: boolean;
  items: NavItemDTO[];
  activePath: string;
  userOptions: UserMenuOptionVM[];
  onNavigate: (href: string) => void;
  onOptionAction: (option: UserMenuOptionVM) => void;
  onClose: () => void;
}

export const MobileMenu = ({
  isOpen,
  items,
  activePath,
  userOptions,
  onNavigate,
  onOptionAction,
  onClose,
}: MobileMenuProps) => {
  const visibleItems = useMemo(() => items.filter((item) => item.visible !== false), [items]);

  return (
    <div
      aria-hidden={!isOpen}
      className={`fixed inset-0 z-50 transition duration-300 ${isOpen ? "pointer-events-auto" : "pointer-events-none"}`}
    >
      <button
        type="button"
        aria-label="Zamknij menu"
        className={`absolute inset-0 bg-white/60 transition duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 ${isOpen ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />

      <div
        className={`absolute right-0 top-0 h-full w-72 overflow-y-auto rounded-l-3xl border border-slate-200 bg-white px-6 py-8 shadow-2xl transition duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-900">Menu</h3>
          <button
            type="button"
            className="text-xs font-semibold uppercase tracking-widest text-slate-500 hover:text-slate-900"
            onClick={onClose}
          >
            Zamknij
          </button>
        </div>

        <nav className="flex flex-col gap-2">
          {visibleItems.map((item) => (
            <NavItem
              key={item.href}
              item={item}
              isActive={item.href === activePath}
              onNavigate={(href) => {
                onNavigate(href);
                onClose();
              }}
            />
          ))}
        </nav>

        <div className="mt-8 border-t border-slate-800 pt-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Użytkownik</p>
          <div className="mt-2 space-y-2">
            {userOptions.map((option) => (
              <button
                key={`${option.label}-${option.href ?? option.type}`}
                type="button"
                className="block w-full rounded-md px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={async () => {
                  await onOptionAction(option);
                  onClose();
                }}
                disabled={option.disabled}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
