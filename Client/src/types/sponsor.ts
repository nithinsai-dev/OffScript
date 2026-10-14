export type SponsorTier = 'HEADLINE' | 'DISRUPTOR' | 'PARTNER' | 'COMMUNITY'

export interface Sponsor {
  id: string
  name: string
  tier: SponsorTier
  industry: string
  url?: string
}
