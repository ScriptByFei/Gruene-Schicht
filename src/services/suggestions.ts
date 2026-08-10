import { supabase } from '../lib/supabase'
import type { Suggestion, SuggestionStatus } from '../types'

async function attachProfiles(suggestions: Suggestion[]): Promise<Suggestion[]> {
  const userIds = Array.from(new Set(suggestions.map((s) => s.user_id)))
  if (userIds.length === 0) return suggestions

  const { data: profiles, error } = await supabase
    .from('profile_directory')
    .select('id, display_name')
    .in('id', userIds)
  if (error) throw error

  const profilesById = new Map<string, Suggestion['profile']>(
    (profiles ?? []).map((profile) => [profile.id, {
      display_name: profile.display_name,
    } as Suggestion['profile']])
  )

  return suggestions.map((suggestion) => ({
    ...suggestion,
    profile: profilesById.get(suggestion.user_id),
  }))
}

export async function getSuggestionsForEvent(eventId: string): Promise<Suggestion[]> {
  const { data, error } = await supabase
    .from('suggestions')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return attachProfiles((data ?? []) as Suggestion[])
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
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  if (error) throw error
  return attachProfiles((data ?? []) as Suggestion[])
}
