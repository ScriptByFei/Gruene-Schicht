import { supabase } from '../lib/supabase'
import type { Event, EventStatus } from '../types'

export async function getActiveEvents(): Promise<Event[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .in('status', ['active', 'closed'])
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Event[]
}

export async function getAllEvents(): Promise<Event[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Event[]
}

export async function getEvent(id: string): Promise<Event | null> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data as Event
}

export async function createEvent(
  payload: Pick<Event, 'title' | 'description' | 'status'> & { created_by: string }
): Promise<Event> {
  const { data, error } = await supabase
    .from('events')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data as Event
}

export async function updateEvent(
  id: string,
  updates: Partial<Pick<Event, 'title' | 'description' | 'status' | 'final_location' | 'final_date' | 'final_note'>>
): Promise<Event> {
  const { data, error } = await supabase
    .from('events')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Event
}

export async function setEventStatus(id: string, status: EventStatus): Promise<void> {
  const { error } = await supabase
    .from('events')
    .update({ status })
    .eq('id', id)
  if (error) throw error
}
