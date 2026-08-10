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
export type AccessRequestStatus = 'pending' | 'approved' | 'rejected'
export type ShiftRequestType = 'absence' | 'swap'
export type ShiftRequestStatus =
  | 'pending_target'
  | 'pending_admin'
  | 'approved'
  | 'rejected'
  | 'cancelled'
export type ShiftOverrideKind = 'absence' | 'swap'
export type NotificationType = 'event' | 'poll' | 'shift_request' | 'suggestion'

export type ShiftGroupColor = 'red' | 'yellow' | 'blue' | 'green' | 'purple' | 'orange' | 'gray'

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
  shift_group_id: string | null
  role: UserRole
  status: MembershipStatus
  joined_at: string
}

export interface ShiftGroup {
  id: string
  organization_id: string
  name: string
  anchor_date: string
  pattern: string
  color: ShiftGroupColor
  sort_order: number
  created_at: string
  updated_at: string
}

export interface OrganizationMemberWithProfile extends OrganizationMembership {
  display_name: string
}

export interface OrganizationAccessRequest {
  id: string
  organization_id: string
  user_id: string
  status: AccessRequestStatus
  requested_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  reviewed_shift_group_id: string | null
}

export interface OrganizationAccessRequestWithProfile extends OrganizationAccessRequest {
  display_name: string
}

export interface ShiftChangeRequest {
  id: string
  organization_id: string
  requester_user_id: string
  request_type: ShiftRequestType
  requester_date: string
  target_user_id: string | null
  target_date: string | null
  note: string | null
  status: ShiftRequestStatus
  target_responded_at: string | null
  target_response_note: string | null
  reviewed_at: string | null
  reviewed_by: string | null
  admin_response_note: string | null
  created_at: string
  updated_at: string
}

export interface ShiftChangeRequestWithProfiles extends ShiftChangeRequest {
  requester_name: string
  target_name: string | null
  reviewer_name: string | null
}

export interface ShiftOverride {
  id: string
  organization_id: string
  user_id: string
  shift_date: string
  shift_symbol: 'F' | 'S' | 'N' | '-'
  kind: ShiftOverrideKind
  source_request_id: string
  created_at: string
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
  starts_at: string | null
  ends_at: string | null
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

export interface EventAttendee {
  user_id: string
  display_name: string
  status: AttendanceStatus
  updated_at: string
}

export interface AppNotification {
  id: string
  organization_id: string
  user_id: string
  type: NotificationType
  title: string
  body: string
  link: string
  actor_user_id: string | null
  read_at: string | null
  created_at: string
}

export interface Suggestion {
  id: string
  event_id: string
  user_id: string
  text: string
  status: SuggestionStatus
  created_at: string
  profile?: Pick<Profile, 'display_name'>
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
