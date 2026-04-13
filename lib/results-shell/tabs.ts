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
    status: 'implemented',
    description: 'Activity metrics, scoring, and detailed repo flow signals.',
  },
  {
    id: 'responsiveness',
    label: 'Responsiveness',
    status: 'implemented',
    description: 'Response-time, backlog-health, and engagement signals from public issue and PR activity.',
  },
  {
    id: 'documentation',
    label: 'Documentation',
    status: 'implemented',
    description: 'Documentation file presence, README quality, and improvement recommendations.',
  },
  {
    id: 'security',
    label: 'Security',
    status: 'implemented',
    description: 'Security posture including OpenSSF Scorecard checks, dependency automation, and branch protection.',
  },
  {
    id: 'recommendations',
    label: 'Recommendations',
    status: 'implemented',
    description: 'Actionable recommendations across all scoring dimensions.',
  },
  {
    id: 'comparison',
    label: 'Comparison',
    status: 'implemented',
    description: 'Side-by-side comparison across analyzed repositories.',
  },
]
