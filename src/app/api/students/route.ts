import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/services/db'
import { Gender } from '@/services/db/prisma/enums'
import { jsonError } from '@/app/api/_lib/helpers'

const ALLOWED_GENDERS = new Set(Object.values(Gender))

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parentId = String(body?.parent_id ?? body?.parentId ?? '').trim()
    const name = String(body?.name ?? '').trim()
    const dob = body?.dob ? new Date(body.dob) : undefined
    const gender = body?.gender ? String(body.gender).toUpperCase() : undefined
    const currentGrade = body?.current_grade ?? body?.currentGrade

    if (!parentId || !name) {
      return jsonError('parent_id and name are required', 400)
    }

    const parent = await prisma.parent.findUnique({ where: { id: parentId } })
    if (!parent) {
      return jsonError('Parent not found', 404)
    }

    if (dob && Number.isNaN(dob.getTime())) {
      return jsonError('dob must be a valid date', 400)
    }

    if (gender && !ALLOWED_GENDERS.has(gender as Gender)) {
      return jsonError('gender must be MALE or FEMALE', 400)
    }

    const student = await prisma.student.create({
      data: {
        parentId,
        name,
        dob,
        gender: gender as Gender | undefined,
        currentGrade: currentGrade ? String(currentGrade) : undefined,
      },
    })

    return NextResponse.json(student, { status: 201 })
  } catch {
    return jsonError('Invalid request body', 400)
  }
}
