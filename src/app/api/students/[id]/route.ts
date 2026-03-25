import { NextResponse } from 'next/server'
import prisma from '@/services/db'
import { jsonError } from '@/app/api/_lib/helpers'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      parent: true,
    },
  })

  if (!student) {
    return jsonError('Student not found', 404)
  }

  return NextResponse.json(student)
}
