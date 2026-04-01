import type { ResultTabDefinition } from '@/specs/006-results-shell/contracts/results-shell-props'

export const resultTabs: ResultTabDefinition[] = [
  {
    id: 'overview',
    label: 'Overview',
    status: 'implemented',
    description: 'Current analysis summary, ecosystem profile, and shared status',
  },
  {
    id: 'comparison',
    label: 'Comparison',
    status: 'placeholder',
    description: 'Comparison view is coming soon.',
  },
  {
    id: 'metrics',
    label: 'Metrics',
    status: 'placeholder',
    description: 'Metrics view is coming soon.',
  },
]
