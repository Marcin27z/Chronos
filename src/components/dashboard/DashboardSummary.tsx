import type { DashboardSummaryDTO } from "@/types";
import { ListTodo, AlertCircle, Clock } from "lucide-react";

/**
 * DashboardSummary Component
 *
 * Komponent wyświetlający statystyki użytkownika: całkowita liczba zadań,
 * liczba zaległych, liczba nadchodzących. Umieszczony na dole Dashboard
 * jako podsumowanie.
 */

interface DashboardSummaryProps {
  summary: DashboardSummaryDTO;
}

export function DashboardSummary({ summary }: DashboardSummaryProps) {
  const stats = [
    {
      label: "Wszystkie zadania",
      value: summary.total_tasks,
      icon: ListTodo,
      iconClassName: "text-primary",
      bgClassName: "bg-primary/10",
    },
    {
      label: "Zaległe",
      value: summary.total_overdue,
      icon: AlertCircle,
      iconClassName: "text-destructive",
      bgClassName: "bg-destructive/10",
    },
    {
      label: "Nadchodzące",
      value: summary.total_upcoming,
      icon: Clock,
      iconClassName: "text-blue-600 dark:text-blue-400",
      bgClassName: "bg-blue-100 dark:bg-blue-900/20",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.label} className="border rounded-lg p-6 space-y-3">
            <div className={`inline-flex rounded-full p-2 ${stat.bgClassName}`}>
              <Icon className={`h-5 w-5 ${stat.iconClassName}`} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-3xl font-bold mt-1">{stat.value}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
