import { supabase } from '../lib/supabase'
import type { AttendanceSummary, AttendanceStatus, EventAttendance, EventAttendee } from '../types'

export async function getUserAttendanceForEvents(
  eventIds: string[],
  userId: string
): Promise<EventAttendance[]> {
  if (eventIds.length === 0) return []

  const { data, error } = await supabase
    .from('event_attendance')
    .select('*')
    .eq('user_id', userId)
    .in('event_id', eventIds)
  if (error) throw error
  return (data ?? []) as EventAttendance[]
}

export async function getAttendanceSummary(eventId: string): Promise<AttendanceSummary> {
  const { data, error } = await supabase.rpc('get_attendance_summary', {
    p_event_id: eventId,
  })
  if (error) throw error

  const summary = data?.[0]
  return {
    attending: Number(summary?.attending ?? 0),
    maybe: Number(summary?.maybe ?? 0),
    declined: Number(summary?.declined ?? 0),
    total: Number(summary?.total ?? 0),
  }
}

export async function getEventAttendeeRoster(eventId: string): Promise<EventAttendee[]> {
  const { data, error } = await supabase.rpc('get_event_attendee_roster', {
    p_event_id: eventId,
  })
  if (error) throw error
  return (data ?? []) as EventAttendee[]
}

export async function getUserAttendance(
  eventId: string,
  userId: string
): Promise<EventAttendance | null> {
  const { data, error } = await supabase
    .from('event_attendance')
    .select('*')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) return null
  return data as EventAttendance | null
}

export async function setAttendance(
  eventId: string,
  userId: string,
  status: AttendanceStatus
): Promise<void> {
  const { error } = await supabase
    .from('event_attendance')
    .upsert(
      { event_id: eventId, user_id: userId, status, updated_at: new Date().toISOString() },
      { onConflict: 'event_id,user_id' }
    )
  if (error) throw error
}
