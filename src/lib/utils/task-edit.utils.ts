import type { IntervalUnit, TaskDTO, TaskHistoryVM, UpdateTaskCommand, EditTaskViewModel } from "@/types";

/**
 * Formatuje interwał do tekstowej reprezentacji
 * @example computeIntervalText(3, "months") -> "3 miesiące"
 */
export function computeIntervalText(value: number, unit: IntervalUnit): string {
  const unitLabels: Record<IntervalUnit, [string, string, string]> = {
    days: ["dzień", "dni", "dni"],
    weeks: ["tydzień", "tygodnie", "tygodni"],
    months: ["miesiąc", "miesiące", "miesięcy"],
    years: ["rok", "lata", "lat"],
  };

  const labels = unitLabels[unit];

  if (value === 1) {
    return `${value} ${labels[0]}`;
  } else if (value >= 2 && value <= 4) {
    return `${value} ${labels[1]}`;
  } else {
    return `${value} ${labels[2]}`;
  }
}

/**
 * Formatuje historię akcji zadania do wyświetlenia
 */
export function formatTaskHistory(task: TaskDTO): TaskHistoryVM {
  if (!task.last_action_date || !task.last_action_type) {
    return {
      lastActionDate: null,
      lastActionType: null,
      displayText: "Brak historii akcji",
    };
  }

  const date = new Date(task.last_action_date);
  const formatter = new Intl.DateTimeFormat("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const actionLabel = task.last_action_type === "completed" ? "Wykonane" : "Pominięte";
  const formattedDate = formatter.format(date);

  return {
    lastActionDate: task.last_action_date,
    lastActionType: task.last_action_type,
    displayText: `Ostatnio ${actionLabel.toLowerCase()}: ${formattedDate}`,
  };
}

/**
 * Oblicza różnicę między oryginalnym zadaniem a edytowanymi wartościami
 * Zwraca tylko zmienione pola jako UpdateTaskCommand
 */
export function computeDiff(original: TaskDTO, current: EditTaskViewModel): UpdateTaskCommand {
  const diff: UpdateTaskCommand = {};

  if (current.title !== original.title) {
    diff.title = current.title;
  }

  // Porównanie description - null i undefined traktowane jako to samo
  const originalDesc = original.description ?? "";
  const currentDesc = current.description ?? "";
  if (currentDesc !== originalDesc) {
    diff.description = current.description || null;
  }

  if (current.interval_value !== original.interval_value) {
    diff.interval_value = current.interval_value;
  }

  if (current.interval_unit !== original.interval_unit) {
    diff.interval_unit = current.interval_unit;
  }

  if (current.preferred_day_of_week !== original.preferred_day_of_week) {
    diff.preferred_day_of_week = current.preferred_day_of_week;
  }

  return diff;
}
