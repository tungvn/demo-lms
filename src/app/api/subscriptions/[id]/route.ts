import { NextResponse } from 'next/server'
import prisma from '@/services/db'
import { jsonError, startOfToday } from '@/app/api/_lib/helpers'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const subscription = await prisma.subscription.findUnique({
    where: { id },
  })

  if (!subscription) {
    return jsonError('Subscription not found', 404)
  }

  const today = startOfToday()
  const remaining = Math.max(0, subscription.totalSessions - subscription.usedSessions)

  return NextResponse.json({
    ...subscription,
    expiry_date: subscription.endDate,
    active: subscription.endDate >= today,
    remaining_sessions: remaining,
  })
}
