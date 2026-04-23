import { supabase } from '../lib/supabase'
import type { AttendanceSummary, AttendanceStatus, EventAttendance } from '../types'

export async function getAttendanceForEvent(eventId: string): Promise<EventAttendance[]> {
  const { data, error } = await supabase
    .from('event_attendance')
    .select('*')
    .eq('event_id', eventId)
  if (error) throw error
  return (data ?? []) as EventAttendance[]
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

export function computeAttendanceSummary(records: EventAttendance[]): AttendanceSummary {
  return {
    attending: records.filter((r) => r.status === 'attending').length,
    maybe: records.filter((r) => r.status === 'maybe').length,
    declined: records.filter((r) => r.status === 'declined').length,
    total: records.length,
  }
}
