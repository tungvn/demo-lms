import type { PrismaClient } from '../../src/services/db/prisma/client'

const CLASS_SEED_DATA = [
  {
    name: 'Toan nang cao 6A',
    subject: 'Toan',
    dayOfWeek: 'MONDAY',
    timeSlot: '18:00-19:30',
    teacherName: 'Co Thu Ha',
    maxStudents: 20,
  },
  {
    name: 'Tieng Anh giao tiep 7B',
    subject: 'Tieng Anh',
    dayOfWeek: 'TUESDAY',
    timeSlot: '18:00-19:30',
    teacherName: 'Thay Quang Huy',
    maxStudents: 18,
  },
  {
    name: 'Khoa hoc tu nhien 5C',
    subject: 'Khoa hoc',
    dayOfWeek: 'WEDNESDAY',
    timeSlot: '17:30-19:00',
    teacherName: 'Co Mai Lan',
    maxStudents: 22,
  },
  {
    name: 'Van hoc 8D',
    subject: 'Ngu van',
    dayOfWeek: 'THURSDAY',
    timeSlot: '19:00-20:30',
    teacherName: 'Thay Hoang Nam',
    maxStudents: 16,
  },
]

export async function seedClasses(prisma: PrismaClient) {
  return Promise.all(
    CLASS_SEED_DATA.map((classData) =>
      prisma.class.create({
        data: classData,
      }),
    ),
  )
}