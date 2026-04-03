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
          className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-[10px] font-semibold leading-none text-slate-500"
        >
          i
        </span>
      ) : null}
    </span>
  )
}
