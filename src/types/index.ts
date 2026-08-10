export type UserRole = 'employee' | 'admin'

export type EventStatus = 'draft' | 'active' | 'closed'

export type PollType = 'single_choice' | 'multiple_choice'

export type AttendanceStatus = 'attending' | 'maybe' | 'declined'

export type SuggestionStatus = 'pending' | 'approved' | 'rejected'

export interface Profile {
  id: string
  name: string
  display_name: string
  shift_start_date: string | null
  role: UserRole
  created_at: string
}

export type MembershipStatus = 'active' | 'disabled'

export interface Organization {
  id: string
  name: string
  slug: string
  timezone: string
  created_at: string
}

export interface OrganizationMembership {
  organization_id: string
  user_id: string
  role: UserRole
  status: MembershipStatus
  joined_at: string
}

export interface Event {
  id: string
  organization_id: string
  title: string
  description: string
  status: EventStatus
  final_location: string | null
  final_date: string | null
  final_note: string | null
  created_by: string | null
  created_at: string
}

export interface Poll {
  id: string
  event_id: string
  title: string
  description: string | null
  type: PollType
  is_open: boolean
  created_at: string
  options?: PollOption[]
}

export interface PollOption {
  id: string
  poll_id: string
  label: string
  created_at: string
}

export interface Vote {
  id: string
  poll_id: string
  option_id: string
  user_id: string
  created_at: string
}

export interface EventAttendance {
  id: string
  event_id: string
  user_id: string
  status: AttendanceStatus
  created_at: string
  updated_at: string
}

export interface Suggestion {
  id: string
  event_id: string
  user_id: string
  text: string
  status: SuggestionStatus
  created_at: string
  profile?: Pick<Profile, 'display_name' | 'shift_start_date'>
}

export interface PollResult {
  option_id: string
  label: string
  count: number
  percentage: number
}

export interface AttendanceSummary {
  attending: number
  maybe: number
  declined: number
  total: number
}
