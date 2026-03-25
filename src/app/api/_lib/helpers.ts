import { NextResponse } from 'next/server'

const DAY_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
}

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

export function normalizeDay(day: string): string {
  return day.trim().toLowerCase()
}

export function parseTimeSlot(timeSlot: string) {
  const match = timeSlot.trim().match(/^(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})$/)

  if (!match) {
    return null
  }

  const startHour = Number(match[1])
  const startMinute = Number(match[2])
  const endHour = Number(match[3])
  const endMinute = Number(match[4])

  if (
    Number.isNaN(startHour) ||
    Number.isNaN(startMinute) ||
    Number.isNaN(endHour) ||
    Number.isNaN(endMinute) ||
    startHour > 23 ||
    endHour > 23 ||
    startMinute > 59 ||
    endMinute > 59
  ) {
    return null
  }

  const start = startHour * 60 + startMinute
  const end = endHour * 60 + endMinute

  if (start >= end) {
    return null
  }

  return { start, end }
}

export function timeSlotsOverlap(first: string, second: string): boolean {
  const a = parseTimeSlot(first)
  const b = parseTimeSlot(second)

  if (!a || !b) {
    return false
  }

  return a.start < b.end && b.start < a.end
}

export function getNextClassStart(dayOfWeek: string, timeSlot: string, fromDate = new Date()) {
  const normalizedDay = normalizeDay(dayOfWeek)
  const targetDay = DAY_INDEX[normalizedDay]
  const parsedSlot = parseTimeSlot(timeSlot)

  if (targetDay === undefined || !parsedSlot) {
    return null
  }

  const candidate = new Date(fromDate)
  const dayDiff = (targetDay - candidate.getDay() + 7) % 7
  candidate.setDate(candidate.getDate() + dayDiff)
  candidate.setHours(Math.floor(parsedSlot.start / 60), parsedSlot.start % 60, 0, 0)

  if (candidate <= fromDate) {
    candidate.setDate(candidate.getDate() + 7)
  }

  return candidate
}

export function decodeRegistrationId(id: string) {
  const decoded = decodeURIComponent(id)

  if (decoded.includes(':')) {
    const [classId, studentId] = decoded.split(':')
    if (classId && studentId) {
      return { classId, studentId }
    }
  }

  if (decoded.includes('__')) {
    const [classId, studentId] = decoded.split('__')
    if (classId && studentId) {
      return { classId, studentId }
    }
  }

  return null
}

export function encodeRegistrationId(classId: string, studentId: string) {
  return `${classId}:${studentId}`
}

export function startOfToday() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}
