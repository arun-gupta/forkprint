'use client'

import { useEffect, useRef, useState } from 'react'
import type { TabMatchCounts } from '@/lib/search/types'
import type { ResultTabId } from '@/specs/006-results-shell/contracts/results-shell-props'

const MARK_CLASS = 'search-highlight'
const MARK_STYLE = 'background-color: rgb(252 211 77); color: rgb(69 26 3); border-radius: 2px; padding: 0 2px;'

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function clearHighlights(container: HTMLElement) {
  const marks = container.querySelectorAll(`mark.${MARK_CLASS}`)
  for (const mark of marks) {
    const parent = mark.parentNode
    if (!parent) continue
    parent.replaceChild(document.createTextNode(mark.textContent ?? ''), mark)
    parent.normalize()
  }
}

function highlightTextNodes(container: HTMLElement, query: string): number {
  const pattern = new RegExp(`(${escapeRegex(query)})`, 'gi')
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (node.parentElement?.closest(`mark.${MARK_CLASS}`)) return NodeFilter.FILTER_REJECT
      if (node.parentElement?.tagName === 'SCRIPT' || node.parentElement?.tagName === 'STYLE') return NodeFilter.FILTER_REJECT
      if (!node.textContent || !pattern.test(node.textContent)) {
        pattern.lastIndex = 0
        return NodeFilter.FILTER_REJECT
      }
      pattern.lastIndex = 0
      return NodeFilter.FILTER_ACCEPT
    },
  })

  const textNodes: Text[] = []
  let current = walker.nextNode()
  while (current) {
    textNodes.push(current as Text)
    current = walker.nextNode()
  }

  let count = 0
  for (const textNode of textNodes) {
    const text = textNode.textContent
    if (!text) continue
    const parts = text.split(pattern)
    if (parts.length <= 1) continue

    const fragment = document.createDocumentFragment()
    for (const part of parts) {
      if (pattern.test(part)) {
        pattern.lastIndex = 0
        const mark = document.createElement('mark')
        mark.className = MARK_CLASS
        mark.setAttribute('style', MARK_STYLE)
        mark.textContent = part
        fragment.appendChild(mark)
        count++
      } else {
        fragment.appendChild(document.createTextNode(part))
      }
    }

    textNode.parentNode?.replaceChild(fragment, textNode)
  }

  return count
}

const TAB_IDS: ResultTabId[] = [
  'overview', 'contributors', 'activity', 'responsiveness',
  'documentation', 'security', 'recommendations', 'comparison',
]

export function useHighlightMatches(
  query: string,
  _activeTab?: string,
): { containerRef: React.RefObject<HTMLDivElement | null>; domMatchCounts: TabMatchCounts; domTotalMatches: number; domMatchedTabCount: number } {
  const containerRef = useRef<HTMLDivElement>(null)
  const [domMatchCounts, setDomMatchCounts] = useState<TabMatchCounts>({})
  const [domTotalMatches, setDomTotalMatches] = useState(0)
  const [domMatchedTabCount, setDomMatchedTabCount] = useState(0)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    clearHighlights(container)

    if (!query.trim()) {
      setDomMatchCounts({})
      setDomTotalMatches(0)
      setDomMatchedTabCount(0)
      return
    }

    // Small delay to let React finish rendering tab content
    const raf = requestAnimationFrame(() => {
      const counts: TabMatchCounts = {}
      let total = 0
      let tabsWithMatches = 0

      for (const tabId of TAB_IDS) {
        const tabDiv = container.querySelector(`[data-tab-content="${tabId}"]`)
        if (!tabDiv) continue
        const tabCount = highlightTextNodes(tabDiv as HTMLElement, query.trim())
        if (tabCount > 0) {
          counts[tabId] = tabCount
          total += tabCount
          tabsWithMatches++
        }
      }

      setDomMatchCounts(counts)
      setDomTotalMatches(total)
      setDomMatchedTabCount(tabsWithMatches)
    })

    return () => {
      cancelAnimationFrame(raf)
      if (container) clearHighlights(container)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, _activeTab])

  return { containerRef, domMatchCounts, domTotalMatches, domMatchedTabCount }
}
