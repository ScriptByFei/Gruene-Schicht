import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Clock, XCircle, Plus, Send } from 'lucide-react'
import { Card, CardHeader } from '../ui/Card'
import { Textarea } from '../ui/Input'
import Button from '../ui/Button'
import { cn } from '../../lib/cn'
import { getCurrentShift } from '../../lib/shifts'
import type { Suggestion, SuggestionStatus } from '../../types'
import { createSuggestion, updateSuggestionStatus } from '../../services/suggestions'

const statusConfig: Record<SuggestionStatus, { label: string; icon: typeof Clock; color: string }> = {
  pending: { label: 'Offen', icon: Clock, color: 'text-amber-600' },
  approved: { label: 'Angenommen', icon: CheckCircle2, color: 'text-emerald-600' },
  rejected: { label: 'Abgelehnt', icon: XCircle, color: 'text-red-500' },
}

interface SuggestionsSectionProps {
  eventId: string
  userId: string
  suggestions: Suggestion[]
  isAdmin?: boolean
  eventClosed?: boolean
  onUpdate: () => void
}

export default function SuggestionsSection({
  eventId,
  userId,
  suggestions,
  isAdmin,
  eventClosed,
  onUpdate,
}: SuggestionsSectionProps) {
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const formRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showForm) return
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    })
  }, [showForm])

  const handleSubmit = async () => {
    if (!text.trim()) return
    setSubmitting(true)
    setError('')
    try {
      await createSuggestion(eventId, userId, text.trim())
      setText('')
      setShowForm(false)
      onUpdate()
    } catch {
      setError('Vorschlag konnte nicht gespeichert werden.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleStatusChange = async (id: string, status: SuggestionStatus) => {
    try {
      await updateSuggestionStatus(id, status)
      onUpdate()
    } catch {
      setError('Status konnte nicht geändert werden.')
    }
  }

  return (
    <Card>
      <CardHeader
        title="Vorschläge"
        subtitle="Orte, Termine oder Aktivitäten vorschlagen"
        action={
          !eventClosed && !showForm ? (
            <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
              <Plus className="w-3.5 h-3.5" />
              Vorschlag
            </Button>
          ) : undefined
        }
      />

      {showForm && (
        <div ref={formRef} className="mt-4 flex flex-col gap-2 scroll-mb-24">
          <Textarea
            placeholder="Dein Vorschlag z.B. 'Restaurant Zur Eiche am 14. März'"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="secondary" onClick={() => { setShowForm(false); setText('') }}>
              Abbrechen
            </Button>
            <Button size="sm" loading={submitting} onClick={handleSubmit} disabled={!text.trim()}>
              <Send className="w-3.5 h-3.5" />
              Einreichen
            </Button>
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      <div className="mt-4 flex flex-col gap-2">
        {suggestions.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">Noch keine Vorschläge</p>
        )}
        {suggestions.map((s) => {
          const { label, icon: Icon, color } = statusConfig[s.status as SuggestionStatus]
          return (
            <div
              key={s.id}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg border',
                s.status === 'approved' && 'border-emerald-200 bg-emerald-50',
                s.status === 'rejected' && 'border-gray-200 bg-gray-50 opacity-60',
                s.status === 'pending' && 'border-gray-200 bg-white'
              )}
            >
              <Icon className={cn('w-4 h-4 mt-0.5 shrink-0', color)} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800">{s.text}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-400">
                    {s.profile?.display_name ?? 'Anonym'}
                    {s.profile?.shift_start_date && ` · ${getCurrentShift(s.profile.shift_start_date) ?? 'Schicht offen'}`}
                  </span>
                  <span className={cn('text-xs font-medium', color)}>{label}</span>
                </div>
              </div>
              {isAdmin && s.status === 'pending' && (
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => handleStatusChange(s.id, 'approved')}
                    className="p-1.5 rounded-md text-emerald-600 hover:bg-emerald-100 transition-colors"
                    title="Annehmen"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleStatusChange(s.id, 'rejected')}
                    className="p-1.5 rounded-md text-red-500 hover:bg-red-100 transition-colors"
                    title="Ablehnen"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}
