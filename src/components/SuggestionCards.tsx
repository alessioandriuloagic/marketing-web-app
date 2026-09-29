interface Suggestion {
  label: string;
  question: string;
  icon: string;
  tone: string;
}

const SUGGESTIONS: Suggestion[] = [
  {
    label: 'Email',
    question: 'Qual è il tasso di clic complessivo delle campagne email?',
    icon: 'M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122',
    tone: 'from-blue-500 to-indigo-500',
  },
  {
    label: 'Aperture',
    question: 'Quante aperture uniche totali ci sono state su tutte le email?',
    icon: 'M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76',
    tone: 'from-violet-500 to-fuchsia-500',
  },
  {
    label: 'Percorsi',
    question: 'Qual è il tasso di conversione degli obiettivi (goal) nei percorsi attivi?',
    icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7',
    tone: 'from-emerald-500 to-teal-500',
  },
  {
    label: 'Interazioni',
    question: 'Quante interazioni totali di marketing sono state registrate?',
    icon: 'M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
    tone: 'from-amber-500 to-orange-500',
  },
];

interface SuggestionCardsProps {
  disabled: boolean;
  onPick: (question: string) => void;
}

export function SuggestionCards({ disabled, onPick }: SuggestionCardsProps) {
  return (
    <div className="grid w-full gap-3 sm:grid-cols-2">
      {SUGGESTIONS.map((suggestion) => (
        <button
          key={suggestion.question}
          type="button"
          onClick={() => onPick(suggestion.question)}
          disabled={disabled}
          className="group flex items-start gap-3 rounded-2xl border border-slate-200 bg-white/80 p-4 text-left shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:pointer-events-none disabled:opacity-50"
        >
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${suggestion.tone} text-white shadow-sm`}
            aria-hidden="true"
          >
            <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d={suggestion.icon} />
            </svg>
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
              {suggestion.label}
            </span>
            <span className="mt-0.5 block text-sm leading-snug text-slate-700 group-hover:text-slate-900">
              {suggestion.question}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
