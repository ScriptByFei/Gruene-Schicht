import { Link } from 'react-router-dom'
import { ChevronRight, MapPin, Calendar } from 'lucide-react'
import { Card } from '../ui/Card'
import EventStatusBadge from './EventStatusBadge'
import type { Event, EventAttendance } from '../../types'
import { cn } from '../../lib/cn'

const attendanceLabels: Record<string, string> = {
  attending: 'Ich bin dabei',
  maybe: 'Vielleicht',
  declined: 'Abgesagt',
}

const attendanceColors: Record<string, string> = {
  attending: 'text-emerald-700 bg-emerald-50',
  maybe: 'text-amber-700 bg-amber-50',
  declined: 'text-red-700 bg-red-50',
}

interface EventCardProps {
  event: Event
  attendance?: EventAttendance | null
}

export default function EventCard({ event, attendance }: EventCardProps) {
  return (
    <Link to={`/events/${event.id}`} className="block group">
      <Card className="hover:border-emerald-200 hover:shadow-md transition-all">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <EventStatusBadge status={event.status as any} />
              {attendance && (
                <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', attendanceColors[attendance.status])}>
                  {attendanceLabels[attendance.status]}
                </span>
              )}
            </div>
            <h3 className="font-semibold text-gray-900 truncate group-hover:text-emerald-700 transition-colors">
              {event.title}
            </h3>
            {event.description && (
              <p className="mt-1 text-sm text-gray-500 line-clamp-2">{event.description}</p>
            )}

            {(event.final_location || event.final_date) && (
              <div className="mt-3 flex flex-wrap gap-3">
                {event.final_location && (
                  <span className="flex items-center gap-1 text-xs text-gray-600">
                    <MapPin className="w-3.5 h-3.5" />
                    {event.final_location}
                  </span>
                )}
                {event.final_date && (
                  <span className="flex items-center gap-1 text-xs text-gray-600">
                    <Calendar className="w-3.5 h-3.5" />
                    {event.final_date}
                  </span>
                )}
              </div>
            )}
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 shrink-0 mt-0.5 group-hover:text-emerald-600 transition-colors" />
        </div>
      </Card>
    </Link>
  )
}
