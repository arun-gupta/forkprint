import type { ResultTabDefinition } from '@/specs/006-results-shell/contracts/results-shell-props'

export const resultTabs: ResultTabDefinition[] = [
  {
    id: 'overview',
    label: 'Overview',
    status: 'implemented',
    description: 'Current analysis summary, ecosystem profile, and shared status',
  },
  {
    id: 'contributors',
    label: 'Contributors',
    status: 'placeholder',
    description: 'Core contributor metrics and sustainability signals are coming soon.',
  },
  {
    id: 'activity',
    label: 'Activity',
    status: 'placeholder',
    description: 'Activity metrics and scoring are coming soon.',
  },
  {
    id: 'responsiveness',
    label: 'Responsiveness',
    status: 'implemented',
    description: 'Response-time, backlog-health, and engagement signals from public issue and PR activity.',
  },
  {
    id: 'comparison',
    label: 'Comparison',
    status: 'implemented',
    description: 'Side-by-side comparison across analyzed repositories.',
  },
]
