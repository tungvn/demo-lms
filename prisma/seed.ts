import 'dotenv/config'

import prisma from '../src/services/db'
import { seedClasses } from './seeds/classes.seed'
import { seedClassRegistrations } from './seeds/class-registrations.seed'
import { seedParents } from './seeds/parents.seed'
import { seedStudents } from './seeds/students.seed'
import { seedSubscriptions } from './seeds/subscriptions.seed'

async function main() {
  await prisma.classRegistration.deleteMany()
  await prisma.subscription.deleteMany()
  await prisma.class.deleteMany()
  await prisma.student.deleteMany()
  await prisma.parent.deleteMany()

  const parents = await seedParents(prisma)
  const students = await seedStudents(prisma, parents)
  const classes = await seedClasses(prisma)
  const classRegistrations = await seedClassRegistrations(prisma, students, classes)
  const subscriptions = await seedSubscriptions(prisma, students)

  console.log('Seed completed successfully')
  console.log(`Parents: ${parents.length}`)
  console.log(`Students: ${students.length}`)
  console.log(`Classes: ${classes.length}`)
  console.log(`Class registrations: ${classRegistrations.length}`)
  console.log(`Subscriptions: ${subscriptions.length}`)
}

main()
  .catch((error) => {
    console.error('Seed failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })