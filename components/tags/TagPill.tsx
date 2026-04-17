'use client'

const TAG_COLORS: Record<string, string> = {
  governance: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-200 dark:border-indigo-800/60',
  community: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800/60',
  'supply-chain': 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-200 dark:border-orange-800/60',
  'quick-win': 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800/60',
  compliance: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-200 dark:border-rose-800/60',
  'contrib-ex': 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-200 dark:border-cyan-800/60',
}

const TAG_RING_COLORS: Record<string, string> = {
  governance: 'ring-indigo-400',
  community: 'ring-amber-400',
  'supply-chain': 'ring-orange-400',
  'quick-win': 'ring-emerald-400',
  compliance: 'ring-rose-400',
  'contrib-ex': 'ring-cyan-400',
}
const DEFAULT_TAG_COLOR = 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700'

export function TagPill({ tag, active, onClick }: { tag: string; active: boolean; onClick: (tag: string) => void }) {
  const color = TAG_COLORS[tag] ?? DEFAULT_TAG_COLOR
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(tag) }}
      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium transition-all ${color} ${active ? `ring-2 ${TAG_RING_COLORS[tag] ?? 'ring-indigo-400'} ring-offset-1` : 'hover:opacity-80'}`}
    >
      {tag}
    </button>
  )
}

export function ActiveFilterBar({ tag, onClear }: { tag: string; onClear: () => void }) {
  const color = TAG_COLORS[tag] ?? DEFAULT_TAG_COLOR
  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60">
      <span className="text-xs text-slate-600 dark:text-slate-300">Filtering by</span>
      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${color}`}>{tag}</span>
      <button
        type="button"
        onClick={onClear}
        className="ml-auto inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-200"
        aria-label="Clear filter"
      >
        <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M2 2l8 8M10 2l-8 8" />
        </svg>
      </button>
    </div>
  )
}
