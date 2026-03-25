import { NextResponse } from 'next/server'
import prisma from '@/services/db'
import { jsonError, startOfToday } from '@/app/api/_lib/helpers'

export async function PATCH(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const subscription = await prisma.subscription.findUnique({
    where: { id },
  })

  if (!subscription) {
    return jsonError('Subscription not found', 404)
  }

  const today = startOfToday()

  if (subscription.endDate < today) {
    return jsonError('Subscription has expired', 400)
  }

  if (subscription.usedSessions >= subscription.totalSessions) {
    return jsonError('Subscription has no remaining sessions', 400)
  }

  const updated = await prisma.subscription.update({
    where: { id },
    data: {
      usedSessions: {
        increment: 1,
      },
    },
  })

  return NextResponse.json(updated)
}
