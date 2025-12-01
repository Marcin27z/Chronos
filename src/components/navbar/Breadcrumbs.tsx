import type { BreadcrumbEntry } from "@/types";

interface BreadcrumbsProps {
  entries: BreadcrumbEntry[];
  onNavigate: (href: string) => void;
}

export const Breadcrumbs = ({ entries, onNavigate }: BreadcrumbsProps) => {
  if (entries.length === 0) {
    return <p className="text-xs uppercase tracking-widest text-slate-500 md:text-sm">Dashboard</p>;
  }

  return (
    <ol className="flex items-center gap-2 text-xs uppercase tracking-widest text-slate-500 md:text-sm">
      {entries.map((entry, index) => {
        const isCurrent = entry.isCurrent ?? index === entries.length - 1;
        const label = entry.label || "Dashboard";
        const href = entry.href;

        return (
          <li key={`${label}-${index}`} className="flex items-center gap-1">
            {index > 0 && <span className="text-slate-400">/</span>}
            {href && !isCurrent ? (
              <button
                type="button"
                className="text-slate-600 hover:text-slate-900 transition"
                onClick={() => onNavigate(href)}
              >
                {label}
              </button>
            ) : (
              <span className="text-slate-700 font-semibold">{label}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
};
