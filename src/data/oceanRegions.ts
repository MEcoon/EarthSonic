export type RegionValidationStatus = 'approximate-unverified'
export type RegionAvailabilityStatus = 'available' | 'unavailable'

export type OceanRegion = {
  id: string
  name: string
  ocean: string
  latitude: number
  longitude: number
  shortDescription: string
  scientificDescription: string
  datasetId: string
  coordinateAccuracy: RegionValidationStatus
  availabilityStatus: RegionAvailabilityStatus
}

/** Existing Explore entry points. Coordinates are retained from the original globe and are not calibrated to the NASA raster. */
export const oceanRegions: OceanRegion[] = [
  {
    id: 'north-atlantic',
    name: 'North Atlantic',
    ocean: 'Atlantic Ocean',
    latitude: 42,
    longitude: -42,
    shortDescription: 'A northern Atlantic starting point for exploring the global visualization.',
    scientificDescription: 'This named area is an exploration entry point. NASA SVS #3912 presents a global ECCO2 model visualization; EarthSonic does not extract a local subset or local physical values here.',
    datasetId: 'ocean-currents',
    coordinateAccuracy: 'approximate-unverified',
    availabilityStatus: 'available',
  },
  {
    id: 'north-pacific',
    name: 'North Pacific',
    ocean: 'Pacific Ocean',
    latitude: 35,
    longitude: 165,
    shortDescription: 'A northern Pacific starting point for exploring the global visualization.',
    scientificDescription: 'This named area is an exploration entry point. NASA SVS #3912 presents a global ECCO2 model visualization; EarthSonic does not extract a local subset or local physical values here.',
    datasetId: 'ocean-currents',
    coordinateAccuracy: 'approximate-unverified',
    availabilityStatus: 'available',
  },
  {
    id: 'southern-ocean',
    name: 'Southern Ocean',
    ocean: 'Southern Ocean',
    latitude: -52,
    longitude: 55,
    shortDescription: 'A Southern Ocean starting point for exploring the global visualization.',
    scientificDescription: 'This named area is an exploration entry point. NASA SVS #3912 presents a global ECCO2 model visualization; EarthSonic does not extract a local subset or local physical values here.',
    datasetId: 'ocean-currents',
    coordinateAccuracy: 'approximate-unverified',
    availabilityStatus: 'available',
  },
]

export function getOceanRegion(id: string | null | undefined): OceanRegion | undefined {
  return oceanRegions.find((region) => region.id === id)
}
