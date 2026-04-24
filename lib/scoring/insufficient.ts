export function makeInsufficientScore<T extends { description: string; summary: string }>(
  fields: T,
): {
  value: 'Insufficient verified public data'
  tone: 'neutral'
  percentile: 0
  bracketLabel: ''
  missingInputs: string[]
} & T {
  return {
    value: 'Insufficient verified public data',
    tone: 'neutral',
    percentile: 0,
    bracketLabel: '',
    missingInputs: [],
    ...fields,
  } as {
    value: 'Insufficient verified public data'
    tone: 'neutral'
    percentile: 0
    bracketLabel: ''
    missingInputs: string[]
  } & T
}
