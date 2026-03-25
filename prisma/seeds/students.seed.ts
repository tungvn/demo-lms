import type { Parent, PrismaClient } from '../../src/services/db/prisma/client'

const STUDENT_SEED_DATA = [
  {
    name: 'Nguyen Gia Han',
    dob: new Date('2012-08-12'),
    gender: 'FEMALE' as const,
    currentGrade: '6',
  },
  {
    name: 'Tran Minh Khoa',
    dob: new Date('2011-04-28'),
    gender: 'MALE' as const,
    currentGrade: '7',
  },
  {
    name: 'Le Bao Ngoc',
    dob: new Date('2013-01-20'),
    gender: 'FEMALE' as const,
    currentGrade: '5',
  },
  {
    name: 'Pham Duc Huy',
    dob: new Date('2010-11-03'),
    gender: 'MALE' as const,
    currentGrade: '8',
  },
]

export async function seedStudents(prisma: PrismaClient, parents: Parent[]) {
  return Promise.all(
    STUDENT_SEED_DATA.map((student, index) =>
      prisma.student.create({
        data: {
          ...student,
          parentId: parents[index % parents.length].id,
        },
      }),
    ),
  )
}