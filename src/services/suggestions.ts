import { supabase } from '../lib/supabase'
import type { Suggestion, SuggestionStatus } from '../types'

export async function getSuggestionsForEvent(eventId: string): Promise<Suggestion[]> {
  const { data, error } = await supabase
    .from('suggestions')
    .select('*, profile:profiles(display_name, shift_group)')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Suggestion[]
}

export async function createSuggestion(
  eventId: string,
  userId: string,
  text: string
): Promise<Suggestion> {
  const { data, error } = await supabase
    .from('suggestions')
    .insert({ event_id: eventId, user_id: userId, text, status: 'pending' })
    .select()
    .single()
  if (error) throw error
  return data as Suggestion
}

export async function updateSuggestionStatus(
  id: string,
  status: SuggestionStatus
): Promise<void> {
  const { error } = await supabase
    .from('suggestions')
    .update({ status })
    .eq('id', id)
  if (error) throw error
}

export async function getAllPendingSuggestions(): Promise<Suggestion[]> {
  const { data, error } = await supabase
    .from('suggestions')
    .select('*, profile:profiles(display_name, shift_group)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Suggestion[]
}
