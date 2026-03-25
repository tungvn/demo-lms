import type { PrismaClient } from '../../src/services/db/prisma/client'

const PARENT_SEED_DATA = [
  {
    name: 'Nguyen Van An',
    email: 'parent1@example.com',
    phone: '0901000001',
  },
  {
    name: 'Tran Thi Binh',
    email: 'parent2@example.com',
    phone: '0901000002',
  },
  {
    name: 'Le Minh Chau',
    email: 'parent3@example.com',
    phone: '0901000003',
  },
  {
    name: 'Pham Quoc Dung',
    email: 'parent4@example.com',
    phone: '0901000004',
  },
]

export async function seedParents(prisma: PrismaClient) {
  return Promise.all(
    PARENT_SEED_DATA.map((parent) =>
      prisma.parent.create({
        data: parent,
      }),
    ),
  )
}