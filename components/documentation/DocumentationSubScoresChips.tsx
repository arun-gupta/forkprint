import type { DocumentationScoreDefinition } from '@/lib/documentation/score-config'

interface DocumentationSubScoresChipsProps {
  score: DocumentationScoreDefinition
}

export function DocumentationSubScoresChips({ score }: DocumentationSubScoresChipsProps) {
  const chips = [
    { label: 'File Presence', value: `${Math.round(score.filePresenceScore * 100)}%` },
    { label: 'README Quality', value: `${Math.round(score.readmeQualityScore * 100)}%` },
    { label: 'Licensing', value: `${Math.round(score.licensingScore * 100)}%` },
    { label: 'Inclusive Naming', value: `${Math.round(score.inclusiveNamingScore * 100)}%` },
  ]

  return (
    <div className="mt-4 flex flex-wrap gap-2" aria-label="Documentation sub-scores">
      {chips.map((chip) => (
        <div key={chip.label} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200">
          <span className="font-semibold text-slate-900 dark:text-slate-100">{chip.label}</span>
          <span className="ml-1 text-slate-500 dark:text-slate-400">{chip.value}</span>
        </div>
      ))}
    </div>
  )
}
