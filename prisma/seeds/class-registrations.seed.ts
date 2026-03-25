import type { Class, PrismaClient, Student } from '../../src/services/db/prisma/client'

export async function seedClassRegistrations(prisma: PrismaClient, students: Student[], classes: Class[]) {
  const totalRegistrations = Math.min(students.length, classes.length)

  return Promise.all(
    Array.from({ length: totalRegistrations }, (_, index) =>
      prisma.classRegistration.create({
        data: {
          studentId: students[index].id,
          classId: classes[index].id,
        },
      }),
    ),
  )
}