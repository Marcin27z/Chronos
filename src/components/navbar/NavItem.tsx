import type { NavItemDTO } from "@/types";

interface NavItemProps {
  item: NavItemDTO;
  isActive: boolean;
  onNavigate: (href: string) => void;
}

const buildHref = (item: NavItemDTO) => {
  if (!item.query || Object.keys(item.query).length === 0) {
    return item.href;
  }

  const params = new URLSearchParams(item.query).toString();
  return params ? `${item.href}?${params}` : item.href;
};

export const NavItem = ({ item, isActive, onNavigate }: NavItemProps) => {
  if (item.visible === false) {
    return null;
  }

  const href = buildHref(item);
  const interactionClass = isActive ? "bg-slate-100 text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900";

  return (
    <button
      type="button"
      className={`flex items-center gap-2 px-4 py-2 rounded-md transition ${interactionClass}`}
      aria-current={isActive ? "page" : undefined}
      onClick={() => onNavigate(href)}
    >
      {item.icon && <span className="text-lg">{item.icon}</span>}
      <span className="text-sm font-medium">{item.label}</span>
    </button>
  );
};
