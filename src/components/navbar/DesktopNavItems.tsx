import { NavItem } from "./NavItem";
import type { NavItemDTO } from "@/types";

interface DesktopNavItemsProps {
  items: NavItemDTO[];
  activePath: string;
  onNavigate: (href: string) => void;
}

export const DesktopNavItems = ({ items, activePath, onNavigate }: DesktopNavItemsProps) => {
  return (
    <nav aria-label="Główna nawigacja" className="hidden md:flex gap-2">
      {items.map((item) => (
        <NavItem key={item.href} item={item} isActive={activePath === item.href} onNavigate={onNavigate} />
      ))}
    </nav>
  );
};
