import { NextResponse } from 'next/server'
import prisma from '@/services/db'
import {
  decodeRegistrationId,
  getNextClassStart,
  jsonError,
  startOfToday,
} from '@/app/api/_lib/helpers'

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const decoded = decodeRegistrationId(id)

  if (!decoded) {
    return jsonError('Invalid registration id format. Use {classId}:{studentId}', 400)
  }

  const registration = await prisma.classRegistration.findUnique({
    where: {
      classId_studentId: {
        classId: decoded.classId,
        studentId: decoded.studentId,
      },
    },
    include: {
      class: true,
    },
  })

  if (!registration) {
    return jsonError('Registration not found', 404)
  }

  const nextClassStart = getNextClassStart(registration.class.dayOfWeek, registration.class.timeSlot)

  if (!nextClassStart) {
    return jsonError('Class schedule is invalid', 400)
  }

  const now = new Date()
  const hoursBeforeClass = (nextClassStart.getTime() - now.getTime()) / (1000 * 60 * 60)
  const shouldRefund = hoursBeforeClass > 24
  const today = startOfToday()

  const result = await prisma.$transaction(async (tx) => {
    await tx.classRegistration.delete({
      where: {
        classId_studentId: {
          classId: decoded.classId,
          studentId: decoded.studentId,
        },
      },
    })

    if (!shouldRefund) {
      return { refunded: false as const, subscriptionId: null as string | null }
    }

    const subscription =
      (await tx.subscription.findFirst({
        where: {
          studentId: decoded.studentId,
          endDate: { gte: today },
          usedSessions: { gt: 0 },
        },
        orderBy: [{ endDate: 'asc' }, { usedSessions: 'desc' }],
      })) ??
      (await tx.subscription.findFirst({
        where: {
          studentId: decoded.studentId,
          usedSessions: { gt: 0 },
        },
        orderBy: [{ endDate: 'desc' }],
      }))

    if (!subscription) {
      return { refunded: false as const, subscriptionId: null as string | null }
    }

    await tx.subscription.update({
      where: { id: subscription.id },
      data: {
        usedSessions: {
          decrement: 1,
        },
      },
    })

    return { refunded: true as const, subscriptionId: subscription.id }
  })

  return NextResponse.json({
    deleted: true,
    refunded: result.refunded,
    refunded_subscription_id: result.subscriptionId,
    hours_before_class: Number(hoursBeforeClass.toFixed(2)),
  })
}
