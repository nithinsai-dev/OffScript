export type EventMode = 'OFFLINE' | 'ONLINE' | string

export type RegistrationStatus = 'OPEN' | 'CLOSED' | 'WAITLIST' | string

export interface ScheduleSummary {
  start_date: string
  start_time: string
  end_date: string
  end_time: string
}

export interface Prize {
  rank: number
  title: string
  amount: number
  description?: string
}

export interface FAQ {
  question: string
  answer: string
}

export interface ScheduleItem {
  event_date: string
  start_time: string
  end_time: string
  venue?: string
}

export interface Organizer {
  id: string
  name: string
  org_type?: string
}

export interface Coordinator {
  id: string
  name: string
  role?: string
  contact?: string
}

export interface Event {
  id: string
  name: string
  blurb?: string
  cover_image_url?: string
  cover_image_alt?: string
  category?: string
  tags?: string[]
  event_type?: string
  event_mode?: EventMode
  event_status?: string
  is_featured?: boolean
  is_technical?: boolean
  price?: number
  is_per_head?: boolean
  min_teamsize?: number
  max_teamsize?: number
  total_seats?: number
  seats_filled?: number
  registration_status?: RegistrationStatus
  registration_deadline?: string
  schedule_summary?: ScheduleSummary
  [key: string]: unknown
}

export interface EventDetail extends Event {
  description?: string
  banner_image_url?: string
  banner_image_alt?: string
  gallery_images?: string[]
  highlights?: string[]
  what_to_expect?: string[]
  eligibility?: string[]
  prerequisites?: string[]
  rules?: string[]
  prizes?: Prize[]
  faqs?: FAQ[]
  schedules?: ScheduleItem[]
  organizers?: Organizer[]
  coordinators?: Coordinator[]
}

export interface EventsApiResponse {
  events: Event[]
}

export interface EventDetailApiResponse {
  event?: EventDetail
  data?: EventDetail
  [key: string]: unknown
}

export type EventFilterCategory = 'ALL' | string
export type EventFilterMode = 'ALL' | 'OFFLINE' | 'ONLINE'
export type EventFilterCost = 'ALL' | 'FREE' | 'PAID'
export type EventFilterStatus = 'ALL' | 'OPEN' | 'CLOSED'

export interface EventFilterState {
  searchQuery: string
  category: EventFilterCategory
  mode: EventFilterMode
  cost: EventFilterCost
  status: EventFilterStatus
}
