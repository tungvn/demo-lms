import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/services/db'
import { jsonError, normalizeDay, parseTimeSlot } from '@/app/api/_lib/helpers'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const name = String(body?.name ?? '').trim()
    const subject = String(body?.subject ?? '').trim()
    const dayOfWeek = String(body?.day_of_week ?? body?.dayOfWeek ?? '').trim()
    const timeSlot = String(body?.time_slot ?? body?.timeSlot ?? '').trim()
    const teacherName = String(body?.teacher_name ?? body?.teacherName ?? '').trim()
    const maxStudents = Number(body?.max_students ?? body?.maxStudents)

    if (!name || !subject || !dayOfWeek || !timeSlot || !teacherName || Number.isNaN(maxStudents)) {
      return jsonError('name, subject, day_of_week, time_slot, teacher_name, max_students are required', 400)
    }

    if (maxStudents <= 0) {
      return jsonError('max_students must be greater than 0', 400)
    }

    if (!parseTimeSlot(timeSlot)) {
      return jsonError('time_slot must follow HH:mm-HH:mm', 400)
    }

    const classItem = await prisma.class.create({
      data: {
        name,
        subject,
        dayOfWeek: normalizeDay(dayOfWeek),
        timeSlot,
        teacherName,
        maxStudents,
      },
    })

    return NextResponse.json(classItem, { status: 201 })
  } catch {
    return jsonError('Invalid request body', 400)
  }
}

export async function GET(req: NextRequest) {
  const day = req.nextUrl.searchParams.get('day')

  const classes = await prisma.class.findMany({
    where: day ? { dayOfWeek: normalizeDay(day) } : undefined,
    include: {
      _count: {
        select: {
          registrations: true,
        },
      },
    },
    orderBy: [{ dayOfWeek: 'asc' }, { timeSlot: 'asc' }],
  })

  return NextResponse.json(classes)
}
