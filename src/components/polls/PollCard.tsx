import { useState } from 'react'
import { CheckCircle2, Circle } from 'lucide-react'
import { Card, CardHeader } from '../ui/Card'
import Badge from '../ui/Badge'
import { cn } from '../../lib/cn'
import type { Poll, Vote, PollResult } from '../../types'
import { castVote, removeVote, replaceVote, computeResults } from '../../services/votes'

interface PollCardProps {
  poll: Poll
  allVotes: Vote[]
  userVotes: Vote[]
  userId: string
  onVoteChange: () => void
}

export default function PollCard({ poll, allVotes, userVotes, userId, onVoteChange }: PollCardProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const options = poll.options ?? []
  const results: PollResult[] = computeResults(allVotes, options)
  const userOptionIds = userVotes.map((v) => v.option_id)
  const totalVotes = allVotes.length

  const handleSingleChoice = async (optionId: string) => {
    if (!poll.is_open) return
    setSaving(true)
    setError('')
    try {
      await replaceVote(poll.id, optionId, userId)
      onVoteChange()
    } catch {
      setError('Abstimmung fehlgeschlagen. Bitte erneut versuchen.')
    } finally {
      setSaving(false)
    }
  }

  const handleMultipleChoice = async (optionId: string) => {
    if (!poll.is_open) return
    setSaving(true)
    setError('')
    try {
      if (userOptionIds.includes(optionId)) {
        await removeVote(poll.id, optionId, userId)
      } else {
        await castVote(poll.id, optionId, userId)
      }
      onVoteChange()
    } catch {
      setError('Abstimmung fehlgeschlagen. Bitte erneut versuchen.')
    } finally {
      setSaving(false)
    }
  }

  const isSingle = poll.type === 'single_choice'

  return (
    <Card>
      <CardHeader
        title={poll.title}
        subtitle={poll.description ?? undefined}
        action={
          <div className="flex items-center gap-2">
            <Badge variant={poll.is_open ? 'green' : 'gray'}>
              {poll.is_open ? 'Offen' : 'Geschlossen'}
            </Badge>
            <Badge variant="gray">{isSingle ? 'Einfachauswahl' : 'Mehrfachauswahl'}</Badge>
          </div>
        }
      />

      <div className="mt-4 flex flex-col gap-2">
        {options.map((option) => {
          const result = results.find((r) => r.option_id === option.id)
          const isSelected = userOptionIds.includes(option.id)
          const percentage = result?.percentage ?? 0
          const count = result?.count ?? 0

          return (
            <button
              key={option.id}
              onClick={() => isSingle ? handleSingleChoice(option.id) : handleMultipleChoice(option.id)}
              disabled={!poll.is_open || saving}
              className={cn(
                'relative w-full text-left rounded-lg border overflow-hidden transition-all',
                poll.is_open && 'cursor-pointer hover:border-emerald-400',
                isSelected
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-200 bg-white',
                (!poll.is_open || saving) && 'cursor-default'
              )}
            >
              {/* Progress bar background */}
              <div
                className={cn(
                  'absolute inset-y-0 left-0 transition-all duration-300',
                  isSelected ? 'bg-emerald-100' : 'bg-gray-100'
                )}
                style={{ width: `${percentage}%` }}
              />

              <div className="relative flex items-center justify-between px-4 py-3 gap-3">
                <div className="flex items-center gap-3">
                  {isSelected ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-gray-400 shrink-0" />
                  )}
                  <span className={cn(
                    'text-sm font-medium',
                    isSelected ? 'text-emerald-800' : 'text-gray-700'
                  )}>
                    {option.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 shrink-0">
                  <span>{count} Stimme{count !== 1 ? 'n' : ''}</span>
                  <span className="font-semibold text-gray-700">{percentage}%</span>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-gray-400">
          {totalVotes} Abstimmung{totalVotes !== 1 ? 'en' : ''} gesamt
          {userVotes.length > 0 && ' · Deine Stimme ist gespeichert'}
        </p>
        {saving && (
          <span className="text-xs text-emerald-600 flex items-center gap-1">
            <span className="w-3 h-3 border border-emerald-600 border-t-transparent rounded-full animate-spin" />
            Speichern…
          </span>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </Card>
  )
}
