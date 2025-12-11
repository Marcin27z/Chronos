import type { BreadcrumbEntry, BreadcrumbsMap, NavItemDTO } from "@/types";

export const navItems: NavItemDTO[] = [
  { label: "Dashboard", href: "/" },
  { label: "Zadania", href: "/tasks" },
  { label: "Pomoc", href: "/help" },
];

const breadcrumbMap: BreadcrumbsMap = {
  "/": [{ label: "Dashboard", href: "/", isCurrent: true }],
  "/tasks": [
    { label: "Dashboard", href: "/" },
    { label: "Zadania", href: "/tasks", isCurrent: true },
  ],
  "/help": [
    { label: "Dashboard", href: "/" },
    { label: "Pomoc", href: "/help", isCurrent: true },
  ],
};

const dynamicBreadcrumbs: { matcher: RegExp; entries: () => BreadcrumbEntry[] }[] = [
  {
    matcher: /^\/tasks\/new$/,
    entries: () => [
      { label: "Dashboard", href: "/" },
      { label: "Zadania", href: "/tasks" },
      { label: "Nowe zadanie", href: "/tasks/new", isCurrent: true },
    ],
  },
  {
    matcher: /^\/tasks\/[^/]+\/edit$/,
    entries: () => [
      { label: "Dashboard", href: "/" },
      { label: "Zadania", href: "/tasks" },
      { label: "Edytuj zadanie", isCurrent: true },
    ],
  },
];

export const resolveBreadcrumbs = (path: string): BreadcrumbEntry[] => {
  if (!path) {
    return breadcrumbMap["/"];
  }

  const normalized = path === "/" ? "/" : path.replace(/\/+$/, "");

  if (breadcrumbMap[normalized]) {
    return breadcrumbMap[normalized];
  }

  const dynamic = dynamicBreadcrumbs.find((entry) => entry.matcher.test(normalized));
  if (dynamic) {
    return dynamic.entries();
  }

  return [
    { label: "Dashboard", href: "/", isCurrent: normalized === "/" },
    { label: normalized.split("/").pop() || "Strona", isCurrent: true },
  ];
};
