import { google } from 'googleapis'
import { addMinutes, format, parseISO, startOfDay, endOfDay } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import type { Business } from '@/types'

const TIMEZONE = 'America/Sao_Paulo'

function getOAuthClient(refreshToken: string) {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )
  auth.setCredentials({ refresh_token: refreshToken })
  return auth
}

export interface AvailableSlot {
  start: string   // ISO string
  end: string     // ISO string
  label: string   // "Segunda, 19/05 às 10h00"
}

export async function getAvailableSlots(
  business: Business,
  date: Date,
  durationMinutes: number
): Promise<AvailableSlot[]> {
  if (!business.google_refresh_token || !business.google_calendar_id) {
    return getMockSlots(date, durationMinutes)
  }

  const auth = getOAuthClient(business.google_refresh_token)
  const calendar = google.calendar({ version: 'v3', auth })

  const dayOfWeek = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][date.getDay()] as keyof typeof business.working_hours
  const dayHours = business.working_hours[dayOfWeek]

  if (!dayHours) return []

  const [startHour, startMin] = dayHours.start.split(':').map(Number)
  const [endHour, endMin] = dayHours.end.split(':').map(Number)

  const workStart = new Date(date)
  workStart.setHours(startHour, startMin, 0, 0)

  const workEnd = new Date(date)
  workEnd.setHours(endHour, endMin, 0, 0)

  // Get busy times from Google Calendar
  const freeBusy = await calendar.freebusy.query({
    requestBody: {
      timeMin: workStart.toISOString(),
      timeMax: workEnd.toISOString(),
      timeZone: TIMEZONE,
      items: [{ id: business.google_calendar_id }],
    },
  })

  const busyTimes = freeBusy.data.calendars?.[business.google_calendar_id]?.busy ?? []

  // Generate all possible slots
  const slots: AvailableSlot[] = []
  let slotStart = new Date(workStart)

  const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

  while (addMinutes(slotStart, durationMinutes) <= workEnd) {
    const slotEnd = addMinutes(slotStart, durationMinutes)

    const isBusy = busyTimes.some(busy => {
      const busyStart = new Date(busy.start!)
      const busyEnd = new Date(busy.end!)
      return slotStart < busyEnd && slotEnd > busyStart
    })

    if (!isBusy) {
      const dayName = dayNames[slotStart.getDay()]
      const dateStr = format(slotStart, 'dd/MM')
      const timeStr = format(slotStart, 'HH:mm')

      slots.push({
        start: slotStart.toISOString(),
        end: slotEnd.toISOString(),
        label: `${dayName}, ${dateStr} às ${timeStr}`,
      })
    }

    slotStart = addMinutes(slotStart, business.slot_duration_minutes)
  }

  return slots
}

export async function createAppointment(
  business: Business,
  customerName: string,
  serviceName: string,
  start: string,
  end: string
): Promise<string> {
  if (!business.google_refresh_token || !business.google_calendar_id) {
    return 'mock_event_id_' + Date.now()
  }

  const auth = getOAuthClient(business.google_refresh_token)
  const calendar = google.calendar({ version: 'v3', auth })

  const event = await calendar.events.insert({
    calendarId: business.google_calendar_id,
    requestBody: {
      summary: `${serviceName} - ${customerName}`,
      start: { dateTime: start, timeZone: TIMEZONE },
      end: { dateTime: end, timeZone: TIMEZONE },
    },
  })

  return event.data.id!
}

// Mock slots for development (when Calendar not configured)
function getMockSlots(date: Date, durationMinutes: number): AvailableSlot[] {
  const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
  const slots: AvailableSlot[] = []
  const hours = [8, 9, 10, 11, 14, 15, 16]

  for (const hour of hours) {
    const start = new Date(date)
    start.setHours(hour, 0, 0, 0)
    const end = addMinutes(start, durationMinutes)

    slots.push({
      start: start.toISOString(),
      end: end.toISOString(),
      label: `${dayNames[start.getDay()]}, ${format(start, 'dd/MM')} às ${format(start, 'HH:mm')}`,
    })
  }

  return slots
}
