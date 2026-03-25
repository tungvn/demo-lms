import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/services/db'
import { jsonError } from '@/app/api/_lib/helpers'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const name = String(body?.name ?? '').trim()
    const email = String(body?.email ?? '').trim()
    const phone = String(body?.phone ?? '').trim()

    if (!name || !email || !phone) {
      return jsonError('name, email, phone are required', 400)
    }

    const parent = await prisma.parent.create({
      data: {
        name,
        email,
        phone,
      },
    })

    return NextResponse.json(parent, { status: 201 })
  } catch {
    return jsonError('Invalid request body', 400)
  }
}
