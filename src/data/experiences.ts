export type ExperienceCategory = 'Oceans'

export type EarthExperience = {
  id: string
  title: string
  category: ExperienceCategory
  description: string
  context: string
  source: string
  image: string
  imageAlt: string
  credit: string
  dateRange: string
}

export const experiences: EarthExperience[] = [
  {
    id: 'ocean-currents',
    title: 'Global sea surface currents & temperature',
    category: 'Oceans',
    description: 'Explore ECCO2 modeled surface-current flows colored by corresponding sea surface temperature.',
    context: 'NASA #3912 shows surface flows from March 25, 2007 to March 3, 2008. The temperature legend spans 0–32 °C; the current sound experience analyzes rendered pixels, not calibrated values.',
    source: 'https://svs.gsfc.nasa.gov/3912/',
    image: '/nasa/ocean-currents/images/global_ecco2_temperature_currents.jpg',
    imageAlt: 'NASA #3912 visualization of global sea surface current flow colored by temperature',
    credit: 'NASA / Goddard Space Flight Center Scientific Visualization Studio',
    dateRange: 'Mar 2007–Mar 2008',
  },
]

export const experienceCategories = ['All ocean views', 'Oceans'] as const
