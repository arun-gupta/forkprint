'use client'

interface HelpLabelProps {
  label: string
  helpText?: string
  className?: string
}

export function HelpLabel({ label, helpText, className }: HelpLabelProps) {
  return (
    <span className={className ? className : 'inline-flex items-center gap-1'}>
      <span>{label}</span>
      {helpText ? (
        <span
          tabIndex={0}
          title={helpText}
          aria-label={`${label}. ${helpText}`}
          className="inline-flex h-4.5 w-4.5 shrink-0 cursor-help items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500 align-middle"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            className="h-3 w-3"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="8" cy="4.75" r="0.75" fill="currentColor" />
            <path d="M8 7V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </span>
      ) : null}
    </span>
  )
}
