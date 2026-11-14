export type Domain = { min: number; max: number }

/** Linear normalization with safe behavior for invalid or zero-width domains. */
export function normalize(value: number, domain: Domain): number {
  if (!Number.isFinite(value) || !Number.isFinite(domain.min) || !Number.isFinite(domain.max) || domain.max <= domain.min) return 0
  return Math.max(0, Math.min(1, (value - domain.min) / (domain.max - domain.min)))
}

export function mapRange(value: number, input: Domain, output: Domain): number {
  const t = normalize(value, input)
  return output.min + t * (output.max - output.min)
}
