/**
 * DashboardHeader Component
 *
 * Komponent wyświetlający nagłówek Dashboard z powitaniem użytkownika
 * i aktualną datą. Zapewnia kontekst czasowy dla wyświetlanych zadań.
 */

interface DashboardHeaderProps {
  userName?: string; // Opcjonalne imię użytkownika
}

export function DashboardHeader({ userName }: DashboardHeaderProps) {
  // Formatowanie aktualnej daty w formacie polskim
  const formatCurrentDate = () => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return now.toLocaleDateString("pl-PL", options);
  };

  const greeting = userName ? `Witaj, ${userName}!` : "Witaj!";

  return (
    <header className="mb-8">
      <h1 className="text-3xl font-bold mb-2">{greeting}</h1>
      <p className="text-muted-foreground capitalize">{formatCurrentDate()}</p>
    </header>
  );
}
