import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/services/db'
import { jsonError } from '@/app/api/_lib/helpers'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const studentId = String(body?.student_id ?? body?.studentId ?? '').trim()
    const packageName = String(body?.package_name ?? body?.packageName ?? '').trim()
    const startDateRaw = body?.start_date ?? body?.startDate
    const endDateRaw = body?.expiry_date ?? body?.end_date ?? body?.endDate
    const totalSessions = Number(body?.total_sessions ?? body?.totalSessions)
    const usedSessions = Number(body?.used_sessions ?? body?.usedSessions ?? 0)

    if (!studentId || !packageName || !startDateRaw || !endDateRaw || Number.isNaN(totalSessions)) {
      return jsonError('student_id, package_name, start_date, expiry_date, total_sessions are required', 400)
    }

    const startDate = new Date(startDateRaw)
    const endDate = new Date(endDateRaw)

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return jsonError('start_date and expiry_date must be valid dates', 400)
    }

    if (endDate < startDate) {
      return jsonError('expiry_date must be after start_date', 400)
    }

    if (totalSessions <= 0) {
      return jsonError('total_sessions must be greater than 0', 400)
    }

    if (usedSessions < 0 || usedSessions > totalSessions) {
      return jsonError('used_sessions must be between 0 and total_sessions', 400)
    }

    const student = await prisma.student.findUnique({ where: { id: studentId } })
    if (!student) {
      return jsonError('Student not found', 404)
    }

    const subscription = await prisma.subscription.create({
      data: {
        studentId,
        packageName,
        startDate,
        endDate,
        totalSessions,
        usedSessions,
      },
    })

    return NextResponse.json(subscription, { status: 201 })
  } catch {
    return jsonError('Invalid request body', 400)
  }
}
