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
    status: 'implemented',
    description: 'Contributor concentration, repeat and new contributor mix.',
  },
  {
    id: 'activity',
    label: 'Activity',
    status: 'implemented',
    description: 'PR throughput, issue flow, commit cadence, release frequency.',
  },
  {
    id: 'responsiveness',
    label: 'Responsiveness',
    status: 'implemented',
    description: 'Response times, resolution speed, backlog health.',
  },
  {
    id: 'documentation',
    label: 'Documentation',
    status: 'implemented',
    description: 'Key project files, README quality, licensing compliance, inclusive naming.',
  },
  {
    id: 'security',
    label: 'Security',
    status: 'implemented',
    description: 'OpenSSF Scorecard, dependency automation, branch protection.',
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
