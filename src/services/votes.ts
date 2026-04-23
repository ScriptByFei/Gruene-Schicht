import { supabase } from '../lib/supabase'
import type { PollResult, Vote } from '../types'

export async function getVotesForPoll(pollId: string): Promise<Vote[]> {
  const { data, error } = await supabase
    .from('votes')
    .select('*')
    .eq('poll_id', pollId)
  if (error) throw error
  return (data ?? []) as Vote[]
}

export async function getUserVotesForPoll(pollId: string, userId: string): Promise<Vote[]> {
  const { data, error } = await supabase
    .from('votes')
    .select('*')
    .eq('poll_id', pollId)
    .eq('user_id', userId)
  if (error) throw error
  return (data ?? []) as Vote[]
}

export async function castVote(pollId: string, optionId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('votes')
    .insert({ poll_id: pollId, option_id: optionId, user_id: userId })
  if (error) throw error
}

export async function removeVote(pollId: string, optionId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('votes')
    .delete()
    .eq('poll_id', pollId)
    .eq('option_id', optionId)
    .eq('user_id', userId)
  if (error) throw error
}

export async function replaceVote(
  pollId: string,
  newOptionId: string,
  userId: string
): Promise<void> {
  // Delete all existing votes for this poll by the user, then insert new one
  const { error: deleteError } = await supabase
    .from('votes')
    .delete()
    .eq('poll_id', pollId)
    .eq('user_id', userId)
  if (deleteError) throw deleteError

  const { error: insertError } = await supabase
    .from('votes')
    .insert({ poll_id: pollId, option_id: newOptionId, user_id: userId })
  if (insertError) throw insertError
}

export function computeResults(
  votes: Vote[],
  options: { id: string; label: string }[]
): PollResult[] {
  const total = votes.length
  return options.map((opt) => {
    const count = votes.filter((v) => v.option_id === opt.id).length
    return {
      option_id: opt.id,
      label: opt.label,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }
  })
}
