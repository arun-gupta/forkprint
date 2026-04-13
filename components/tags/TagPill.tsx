'use client'

const TAG_COLORS: Record<string, string> = {
  governance: 'bg-indigo-50 text-indigo-700 border-indigo-200',
}
const DEFAULT_TAG_COLOR = 'bg-slate-50 text-slate-600 border-slate-200'

export function TagPill({ tag, active, onClick }: { tag: string; active: boolean; onClick: (tag: string) => void }) {
  const color = TAG_COLORS[tag] ?? DEFAULT_TAG_COLOR
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(tag) }}
      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium transition-all ${color} ${active ? 'ring-2 ring-indigo-400 ring-offset-1' : 'hover:opacity-80'}`}
    >
      {tag}
    </button>
  )
}

export function ActiveFilterBar({ tag, onClear }: { tag: string; onClear: () => void }) {
  const color = TAG_COLORS[tag] ?? DEFAULT_TAG_COLOR
  return (
    <div className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2">
      <span className="text-xs text-indigo-600">Filtering by</span>
      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${color}`}>{tag}</span>
      <button
        type="button"
        onClick={onClear}
        className="ml-auto inline-flex h-5 w-5 items-center justify-center rounded-full text-indigo-400 hover:bg-indigo-100 hover:text-indigo-600"
        aria-label="Clear filter"
      >
        <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M2 2l8 8M10 2l-8 8" />
        </svg>
      </button>
    </div>
  )
}
