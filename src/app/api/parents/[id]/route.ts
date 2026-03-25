import { NextResponse } from 'next/server'
import prisma from '@/services/db'
import { jsonError } from '@/app/api/_lib/helpers'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const parent = await prisma.parent.findUnique({
    where: { id },
    include: {
      students: true,
    },
  })

  if (!parent) {
    return jsonError('Parent not found', 404)
  }

  return NextResponse.json(parent)
}
