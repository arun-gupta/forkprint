export interface TierBand<T extends string> {
  label: T
  min: number
}

export type ReachTier = 'Emerging' | 'Growing' | 'Strong' | 'Exceptional'

// Reach bands remain fixed — they define the bracket boundaries themselves.
export const REACH_BANDS: TierBand<ReachTier>[] = [
  { label: 'Exceptional', min: 100000 },
  { label: 'Strong', min: 50000 },
  { label: 'Growing', min: 10000 },
  { label: 'Emerging', min: 0 },
]

export function classifyFromBands<T extends string>(value: number, bands: TierBand<T>[]) {
  return bands.find((band) => value >= band.min)?.label ?? bands[bands.length - 1]!.label
}

export function formatBandLegend<T extends string>(bands: TierBand<T>[], formatter: (value: number) => string) {
  return bands
    .map((band, index) => {
      const nextBand = bands[index - 1]

      if (!nextBand) {
        return `${band.label} ${formatter(band.min)}+`
      }

      return `${band.label} ${formatter(band.min)}-${formatter(nextBand.min)}`
    })
    .reverse()
    .join(', ')
}
