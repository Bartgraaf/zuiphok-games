import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  const adminHash = await bcrypt.hash('admin1234', 12)
  const playerHash = await bcrypt.hash('player1234', 12)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@zuiphok.local' },
    update: { name: 'Admin', passwordHash: adminHash, role: 'ADMIN' },
    create: {
      name: 'Admin',
      email: 'admin@zuiphok.local',
      passwordHash: adminHash,
      role: 'ADMIN',
    },
  })

  const player = await prisma.user.upsert({
    where: { email: 'player@zuiphok.local' },
    update: { name: 'Player One', passwordHash: playerHash, role: 'PLAYER' },
    create: {
      name: 'Player One',
      email: 'player@zuiphok.local',
      passwordHash: playerHash,
      role: 'PLAYER',
    },
  })

  console.log('Seeded users:', { admin: admin.email, player: player.email })
  console.log('Credentials:')
  console.log('  admin@zuiphok.local / admin1234')
  console.log('  player@zuiphok.local / player1234')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
