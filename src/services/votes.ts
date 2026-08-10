import { supabase } from '../lib/supabase'
import type { PollResult, Vote } from '../types'

export async function getPollResults(
  pollId: string,
  options: { id: string; label: string }[]
): Promise<PollResult[]> {
  const { data, error } = await supabase.rpc('get_poll_results', { p_poll_id: pollId })
  if (error) throw error

  const counts = new Map((data ?? []).map((row) => [row.option_id, Number(row.vote_count)]))
  const total = Array.from(counts.values()).reduce((sum, count) => sum + count, 0)

  return options.map((option) => {
    const count = counts.get(option.id) ?? 0
    return {
      option_id: option.id,
      label: option.label,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }
  })
}

export async function getUserVotesForPoll(pollId: string, userId: string): Promise<Vote[]> {
  const { data, error } = await supabase
    .from('votes')
    .select('id, poll_id, option_id, user_id, created_at')
    .eq('poll_id', pollId)
    .eq('user_id', userId)
    .limit(50)
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
  if (!userId) throw new Error('A user is required to vote')
  const { error } = await supabase.rpc('replace_single_vote', {
    p_poll_id: pollId,
    p_option_id: newOptionId,
  })
  if (error) throw error
}
