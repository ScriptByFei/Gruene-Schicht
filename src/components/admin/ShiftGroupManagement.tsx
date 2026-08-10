import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Pencil, Plus, Trash2, Users } from 'lucide-react'
import Button from '../ui/Button'
import { Card, CardHeader } from '../ui/Card'
import { Input, Select } from '../ui/Input'
import { DEFAULT_SHIFT_PATTERN, formatShiftStartDate } from '../../lib/shifts'
import {
  assignMemberShiftGroup,
  createShiftGroup,
  deleteShiftGroup,
  getOrganizationMembers,
  getShiftGroups,
  updateShiftGroup,
  type ShiftGroupInput,
} from '../../services/shiftGroups'
import type { OrganizationMemberWithProfile, ShiftGroup, ShiftGroupColor } from '../../types'

const colorOptions = [
  { value: 'red', label: 'Rot' },
  { value: 'yellow', label: 'Gelb' },
  { value: 'blue', label: 'Blau' },
  { value: 'green', label: 'Grün' },
  { value: 'purple', label: 'Lila' },
  { value: 'orange', label: 'Orange' },
  { value: 'gray', label: 'Grau' },
]

const colorClass: Record<ShiftGroupColor, string> = {
  red: 'bg-red-500',
  yellow: 'bg-amber-400',
  blue: 'bg-blue-600',
  green: 'bg-emerald-500',
  purple: 'bg-purple-500',
  orange: 'bg-orange-500',
  gray: 'bg-gray-500',
}

const emptyForm = (sortOrder: number): ShiftGroupInput => ({
  name: '',
  anchor_date: '',
  pattern: DEFAULT_SHIFT_PATTERN,
  color: 'green',
  sort_order: sortOrder,
})

interface ShiftGroupManagementProps {
  organizationId: string
  onAssignmentChanged: () => Promise<void>
}

export default function ShiftGroupManagement({
  organizationId,
  onAssignmentChanged,
}: ShiftGroupManagementProps) {
  const [groups, setGroups] = useState<ShiftGroup[]>([])
  const [members, setMembers] = useState<OrganizationMemberWithProfile[]>([])
  const [form, setForm] = useState<ShiftGroupInput>(() => emptyForm(10))
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    const [nextGroups, nextMembers] = await Promise.all([
      getShiftGroups(organizationId),
      getOrganizationMembers(organizationId),
    ])
    setGroups(nextGroups)
    setMembers(nextMembers)
  }, [organizationId])

  useEffect(() => {
    let cancelled = false

    const loadInitialData = async () => {
      try {
        const [nextGroups, nextMembers] = await Promise.all([
          getShiftGroups(organizationId),
          getOrganizationMembers(organizationId),
        ])
        if (!cancelled) {
          setGroups(nextGroups)
          setMembers(nextMembers)
        }
      } catch {
        if (!cancelled) setError('Schichtgruppen konnten nicht geladen werden.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadInitialData()
    return () => { cancelled = true }
  }, [organizationId])

  const groupOptions = useMemo(() => [
    { value: '', label: 'Noch nicht zugeordnet' },
    ...groups.map((group) => ({ value: group.id, label: `${group.name} Schicht` })),
  ], [groups])

  const openCreateForm = () => {
    const nextSortOrder = groups.length ? Math.max(...groups.map((group) => group.sort_order)) + 10 : 10
    setEditingId(null)
    setForm(emptyForm(nextSortOrder))
    setShowForm(true)
  }

  const openEditForm = (group: ShiftGroup) => {
    setEditingId(group.id)
    setForm({
      name: group.name,
      anchor_date: group.anchor_date,
      pattern: group.pattern,
      color: group.color,
      sort_order: group.sort_order,
    })
    setShowForm(true)
  }

  const handleSave = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (editingId) await updateShiftGroup(editingId, form)
      else await createShiftGroup(organizationId, form)
      setShowForm(false)
      setEditingId(null)
      await loadData()
    } catch {
      setError('Schichtgruppe konnte nicht gespeichert werden. Name, Datum und Rhythmus prüfen.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (group: ShiftGroup) => {
    const assignedCount = members.filter((member) => member.shift_group_id === group.id).length
    const suffix = assignedCount
      ? ` ${assignedCount} Zuordnung${assignedCount === 1 ? '' : 'en'} werden dabei entfernt.`
      : ''
    if (!window.confirm(`Schichtgruppe „${group.name}“ wirklich löschen?${suffix}`)) return
    try {
      await deleteShiftGroup(group.id)
      await Promise.all([loadData(), onAssignmentChanged()])
    } catch {
      setError('Schichtgruppe konnte nicht gelöscht werden.')
    }
  }

  const handleAssignment = async (member: OrganizationMemberWithProfile, value: string) => {
    setError('')
    const previousGroupId = member.shift_group_id
    setMembers((current) => current.map((entry) => (
      entry.user_id === member.user_id
        ? { ...entry, shift_group_id: value || null }
        : entry
    )))
    try {
      await assignMemberShiftGroup(organizationId, member.user_id, value || null)
      await onAssignmentChanged()
    } catch {
      setMembers((current) => current.map((entry) => (
        entry.user_id === member.user_id
          ? { ...entry, shift_group_id: previousGroupId }
          : entry
      )))
      setError('Zuordnung konnte nicht gespeichert werden.')
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader
        title="Schichtplanung"
        subtitle="Gruppen und Zuordnungen zentral für Kalender und Dashboard verwalten."
        action={
          <Button size="sm" variant="outline" onClick={openCreateForm}>
            <Plus className="h-3.5 w-3.5" />
            Gruppe
          </Button>
        }
      />

      {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {showForm && (
        <form onSubmit={handleSave} className="mt-4 grid gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:grid-cols-2">
          <Input
            label="Name"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="z. B. Grüne"
            required
            autoFocus
          />
          <Input
            label="Ankerdatum (Tag 1)"
            type="date"
            value={form.anchor_date}
            onChange={(event) => setForm((current) => ({ ...current, anchor_date: event.target.value }))}
            required
          />
          <Input
            label="Rhythmus"
            value={form.pattern}
            onChange={(event) => setForm((current) => ({ ...current, pattern: event.target.value.toUpperCase() }))}
            pattern="[FSN-]+"
            maxLength={366}
            hint="F = Früh, S = Spät, N = Nacht, - = Frei"
            required
          />
          <Select
            label="Farbe"
            value={form.color}
            onChange={(event) => setForm((current) => ({ ...current, color: event.target.value as ShiftGroupColor }))}
            options={colorOptions}
          />
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setShowForm(false)}>
              Abbrechen
            </Button>
            <Button type="submit" size="sm" loading={saving}>
              {editingId ? 'Speichern' : 'Erstellen'}
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="mt-5 text-sm text-gray-400">Schichtplanung wird geladen …</p>
      ) : (
        <>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {groups.map((group) => (
              <div key={group.id} className="flex items-start gap-3 rounded-xl border border-gray-200 p-3">
                <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${colorClass[group.color]}`} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900">{group.name} Schicht</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Tag 1: {formatShiftStartDate(group.anchor_date)}
                  </p>
                  <p className="mt-1 break-all font-mono text-[10px] text-gray-400">{group.pattern}</p>
                </div>
                <button type="button" onClick={() => openEditForm(group)} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100" aria-label={`${group.name} bearbeiten`}>
                  <Pencil className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => handleDelete(group)} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50" aria-label={`${group.name} löschen`}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {groups.length === 0 && <p className="text-sm text-gray-400">Noch keine Schichtgruppen vorhanden.</p>}
          </div>

          <div className="mt-6 border-t border-gray-100 pt-5">
            <div className="mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-500" />
              <h4 className="text-sm font-semibold text-gray-800">Mitarbeitende zuordnen</h4>
            </div>
            <div className="flex flex-col gap-2">
              {members.map((member) => (
                <div key={member.user_id} className="grid items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 sm:grid-cols-[1fr_14rem]">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{member.display_name}</p>
                    <p className="text-xs text-gray-400">{member.role === 'admin' ? 'Admin' : 'Mitarbeitend'}</p>
                  </div>
                  <Select
                    aria-label={`Schichtgruppe für ${member.display_name}`}
                    value={member.shift_group_id ?? ''}
                    onChange={(event) => handleAssignment(member, event.target.value)}
                    options={groupOptions}
                  />
                </div>
              ))}
              {members.length === 0 && <p className="text-sm text-gray-400">Noch keine aktiven Mitarbeitenden vorhanden.</p>}
            </div>
          </div>
        </>
      )}
    </Card>
  )
}
