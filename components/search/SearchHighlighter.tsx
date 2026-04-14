function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

interface SearchHighlighterProps {
  text: string
  query: string
}

export function SearchHighlighter({ text, query }: SearchHighlighterProps) {
  if (!query) return <>{text}</>

  const pattern = new RegExp(`(${escapeRegex(query)})`, 'gi')
  const parts = text.split(pattern)

  if (parts.length === 1) return <>{text}</>

  return (
    <>
      {parts.map((part, i) =>
        pattern.test(part) ? (
          <mark key={i} className="bg-amber-300 text-amber-950 rounded-sm px-0.5">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  )
}
