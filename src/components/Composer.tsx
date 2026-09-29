import { useEffect, useRef, useState } from 'react';

interface ComposerProps {
  disabled: boolean;
  onSend: (question: string) => void;
}

const MAX_ROWS_PX = 200;

export function Composer({ disabled, onSend }: ComposerProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Grow the textarea with its content, up to a fixed cap.
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_ROWS_PX)}px`;
  }, [value]);

  const submit = () => {
    const question = value.trim();
    if (!question || disabled) return;
    setValue('');
    onSend(question);
  };

  return (
    <div className="relative z-10 bg-gradient-to-t from-slate-50 via-slate-50 to-slate-50/0 px-4 pb-4 pt-2">
      <form
        className="mx-auto max-w-3xl"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg shadow-slate-200/60 transition-shadow focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-100">
          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Chiedi qualsiasi cosa sui tuoi dati…"
            aria-label="Messaggio"
            className="max-h-[200px] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={disabled || !value.trim()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-600/25 transition-all hover:brightness-110 disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none"
            aria-label="Invia messaggio"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
        </div>
        <p className="mt-2 text-center text-xs text-slate-400">
          Le risposte sono generate dal Data Agent di Fabric. Verifica i numeri importanti.
          <span className="hidden sm:inline"> · Invio per inviare, Maiusc+Invio per andare a capo</span>
        </p>
      </form>
    </div>
  );
}
