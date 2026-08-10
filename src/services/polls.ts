import { supabase } from '../lib/supabase'
import type { Poll, PollOption } from '../types'

export async function getPollsForEvent(eventId: string): Promise<Poll[]> {
  const { data: polls, error: pollsError } = await supabase
    .from('polls')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at')
  if (pollsError) throw pollsError

  const pollIds = (polls ?? []).map((p) => p.id)
  if (pollIds.length === 0) return []

  const { data: options, error: optionsError } = await supabase
    .from('poll_options')
    .select('*')
    .in('poll_id', pollIds)
    .order('created_at')
  if (optionsError) throw optionsError

  return (polls ?? []).map((poll) => ({
    ...(poll as Poll),
    options: ((options ?? []) as PollOption[]).filter((o) => o.poll_id === poll.id),
  }))
}

export async function createPoll(
  payload: Pick<Poll, 'event_id' | 'title' | 'description' | 'type'>,
  optionLabels: string[]
): Promise<Poll> {
  const { data: pollId, error: createError } = await supabase.rpc('create_poll_with_options', {
    p_event_id: payload.event_id,
    p_title: payload.title,
    p_description: payload.description ?? '',
    p_type: payload.type,
    p_option_labels: optionLabels,
  })
  if (createError) throw createError

  const { data: poll, error: pollError } = await supabase
    .from('polls')
    .select('*')
    .eq('id', pollId)
    .single()
  if (pollError) throw pollError
  return poll as Poll
}

export async function togglePollOpen(id: string, is_open: boolean): Promise<void> {
  const { error } = await supabase.from('polls').update({ is_open }).eq('id', id)
  if (error) throw error
}

export async function deletePoll(id: string): Promise<void> {
  const { error } = await supabase.from('polls').delete().eq('id', id)
  if (error) throw error
}
