import type { PrismaClient, Student } from '../../src/services/db/prisma/client'

function getCurrentMonthRange() {
  const now = new Date()
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  return { startDate, endDate }
}

export async function seedSubscriptions(prisma: PrismaClient, students: Student[]) {
  const { startDate, endDate } = getCurrentMonthRange()

  return Promise.all(
    students.map((student) =>
      prisma.subscription.create({
        data: {
          studentId: student.id,
          packageName: 'hoc-5-buoi-tuan',
          startDate,
          endDate,
          totalSessions: 20,
          usedSessions: 0,
        },
      }),
    ),
  )
}