import { useEffect, useState } from 'react'

export function useSearchDebounce(query: string, delay = 300) {
  const [debounced, setDebounced] = useState(query)

  useEffect(() => {
    if (!query) {
      setDebounced('')
      return
    }
    const timeout = setTimeout(() => setDebounced(query), delay)
    return () => clearTimeout(timeout)
  }, [query, delay])

  return debounced
}
