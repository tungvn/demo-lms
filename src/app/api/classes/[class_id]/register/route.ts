import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/services/db'
import {
  encodeRegistrationId,
  jsonError,
  startOfToday,
  timeSlotsOverlap,
} from '@/app/api/_lib/helpers'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ class_id: string }> },
) {
  const { class_id: classId } = await params

  try {
    const body = await req.json()
    const studentId = String(body?.student_id ?? body?.studentId ?? '').trim()

    if (!studentId) {
      return jsonError('student_id is required', 400)
    }

    const student = await prisma.student.findUnique({ where: { id: studentId } })
    if (!student) {
      return jsonError('Student not found', 404)
    }

    const classItem = await prisma.class.findUnique({ where: { id: classId } })
    if (!classItem) {
      return jsonError('Class not found', 404)
    }

    const existingRegistrations = await prisma.classRegistration.findMany({
      where: { studentId },
      include: { class: true },
    })

    if (existingRegistrations.some((reg) => reg.classId === classId)) {
      return jsonError('Student already registered to this class', 409)
    }

    const hasConflict = existingRegistrations.some(
      (reg) =>
        reg.class.dayOfWeek === classItem.dayOfWeek &&
        timeSlotsOverlap(reg.class.timeSlot, classItem.timeSlot),
    )

    if (hasConflict) {
      return jsonError('Schedule conflict: student already has class in the same time slot', 409)
    }

    const today = startOfToday()
    const activeSubscriptions = await prisma.subscription.findMany({
      where: {
        studentId,
        startDate: { lte: today },
        endDate: { gte: today },
      },
      orderBy: [{ endDate: 'asc' }, { usedSessions: 'asc' }],
    })

    const activeSubscription = activeSubscriptions.find(
      (subscription) => subscription.usedSessions < subscription.totalSessions,
    )

    if (!activeSubscription) {
      return jsonError('No active subscription found', 400)
    }

    if (activeSubscription.usedSessions >= activeSubscription.totalSessions) {
      return jsonError('Subscription has no remaining sessions', 400)
    }

    const result = await prisma.$transaction(async (tx) => {
      const latestClass = await tx.class.findUnique({
        where: { id: classId },
        include: {
          _count: {
            select: { registrations: true },
          },
        },
      })

      if (!latestClass) {
        throw new Error('CLASS_NOT_FOUND')
      }

      if (latestClass._count.registrations >= latestClass.maxStudents) {
        throw new Error('CLASS_FULL')
      }

      const registration = await tx.classRegistration.create({
        data: {
          classId,
          studentId,
        },
      })

      const updatedSubscription = await tx.subscription.update({
        where: { id: activeSubscription.id },
        data: {
          usedSessions: {
            increment: 1,
          },
        },
      })

      return { registration, updatedSubscription }
    })

    return NextResponse.json(
      {
        id: encodeRegistrationId(result.registration.classId, result.registration.studentId),
        class_id: result.registration.classId,
        student_id: result.registration.studentId,
        subscription: {
          id: result.updatedSubscription.id,
          used_sessions: result.updatedSubscription.usedSessions,
          total_sessions: result.updatedSubscription.totalSessions,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'CLASS_FULL') {
        return jsonError('Class is already full', 409)
      }
      if (error.message === 'CLASS_NOT_FOUND') {
        return jsonError('Class not found', 404)
      }
      if (error.message.includes('Unique constraint')) {
        return jsonError('Student already registered to this class', 409)
      }
    }

    return jsonError('Invalid request body', 400)
  }
}
