/**
 * Formatuje datę ISO do czytelnego formatu w języku polskim
 * Z obsługą względnych dat (Dzisiaj, Jutro, Wczoraj)
 */
export function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();

  // Resetujemy czas do porównania tylko dat
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const nowOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffDays = Math.floor((dateOnly.getTime() - nowOnly.getTime()) / (1000 * 60 * 60 * 24));

  // Jeśli dzisiaj
  if (diffDays === 0) {
    return "Dzisiaj";
  }

  // Jeśli jutro
  if (diffDays === 1) {
    return "Jutro";
  }

  // Jeśli wczoraj
  if (diffDays === -1) {
    return "Wczoraj";
  }

  // W przeciwnym razie pełna data
  return new Intl.DateTimeFormat("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

/**
 * Formatuje interwał zadania do czytelnego formatu
 * np. "Co dzień", "Co 2 tygodnie", "Co 5 miesięcy"
 */
export function formatInterval(value: number, unit: string): string {
  const unitLabels: Record<string, [string, string, string]> = {
    days: ["dzień", "dni", "dni"],
    weeks: ["tydzień", "tygodnie", "tygodni"],
    months: ["miesiąc", "miesiące", "miesięcy"],
    years: ["rok", "lata", "lat"],
  };

  const labels = unitLabels[unit] || ["", "", ""];

  if (value === 1) {
    return `Co ${labels[0]}`;
  } else if (value >= 2 && value <= 4) {
    return `Co ${value} ${labels[1]}`;
  } else {
    return `Co ${value} ${labels[2]}`;
  }
}

/**
 * Zwraca prawidłową formę słowa "zadanie" w zależności od liczby
 * np. "1 zadanie", "2 zadania", "5 zadań"
 */
export function getTasksLabel(count: number): string {
  if (count === 1) {
    return "zadanie";
  } else if (count >= 2 && count <= 4) {
    return "zadania";
  } else {
    return "zadań";
  }
}

/**
 * Zwraca nazwę dnia tygodnia po polsku (0 = Niedziela, 6 = Sobota)
 */
export function getDayOfWeekLabel(day: number | null): string {
  if (day === null) return "Bez preferencji";

  const days = ["Niedziela", "Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota"];
  return days[day] || "Nieznany";
}
