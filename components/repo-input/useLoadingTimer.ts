import { useEffect, useRef, useState } from 'react'
import { LOADING_QUOTES, getRandomQuoteIndex } from '@/lib/loading-quotes'

export function useLoadingTimer(isLoading: boolean, isEmptyState: boolean) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [emptyQuoteIndex, setEmptyQuoteIndex] = useState(() => getRandomQuoteIndex(null))
  const [quoteIndex, setQuoteIndex] = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const quoteTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Read via ref so the loading-start effect doesn't re-run (resetting elapsed seconds)
  // each time the idle quote rotates.
  const emptyQuoteIndexRef = useRef(emptyQuoteIndex)
  emptyQuoteIndexRef.current = emptyQuoteIndex

  useEffect(() => {
    if (isLoading) {
      setElapsedSeconds(0)
      setQuoteIndex(emptyQuoteIndexRef.current)
      timerRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000)
      quoteTimerRef.current = setInterval(() => setQuoteIndex((c) => getRandomQuoteIndex(c)), 10000)
      return () => {
        if (timerRef.current) clearInterval(timerRef.current)
        if (quoteTimerRef.current) clearInterval(quoteTimerRef.current)
      }
    }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    if (quoteTimerRef.current) { clearInterval(quoteTimerRef.current); quoteTimerRef.current = null }
    setElapsedSeconds(0)
    setQuoteIndex(null)
    return undefined
  }, [isLoading])

  useEffect(() => {
    if (!isEmptyState) return
    const interval = setInterval(() => setEmptyQuoteIndex((c) => getRandomQuoteIndex(c)), 10000)
    return () => clearInterval(interval)
  }, [isEmptyState])

  return {
    elapsedSeconds,
    currentQuote: quoteIndex !== null ? LOADING_QUOTES[quoteIndex] : null,
    emptyQuote: LOADING_QUOTES[emptyQuoteIndex],
  }
}
