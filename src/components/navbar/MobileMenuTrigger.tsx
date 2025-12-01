interface MobileMenuTriggerProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const MobileMenuTrigger = ({ isOpen, onToggle }: MobileMenuTriggerProps) => (
  <button
    type="button"
    className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 text-slate-600 transition hover:border-slate-500 md:hidden"
    aria-label={isOpen ? "Zamknij menu" : "Otwórz menu"}
    onClick={onToggle}
  >
    <span className="sr-only">Menu mobilne</span>
    <div className="h-px w-5 bg-slate-600" />
  </button>
);
