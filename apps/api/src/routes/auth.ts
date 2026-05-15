import { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { RegisterSchema, LoginSchema } from '@zuiphok/shared'
import { prisma } from '../lib/prisma'

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/register', async (request, reply) => {
    const result = RegisterSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: result.error.flatten().fieldErrors })
    }

    const { name, email, password } = result.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return reply.status(409).send({ error: 'Email already in use' })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: { name, email, passwordHash },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    })

    const token = fastify.jwt.sign({ sub: user.id, role: user.role })
    return reply.status(201).send({ token, user })
  })

  fastify.post('/login', async (request, reply) => {
    const result = LoginSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: result.error.flatten().fieldErrors })
    }

    const { email, password } = result.data

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.passwordHash) {
      return reply.status(401).send({ error: 'Invalid credentials' })
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return reply.status(401).send({ error: 'Invalid credentials' })
    }

    const token = fastify.jwt.sign({ sub: user.id, role: user.role })
    const { passwordHash: _, ...safeUser } = user
    return reply.send({ token, user: safeUser })
  })

  fastify.get('/me', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const payload = request.user as { sub: string }
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    })
    if (!user) return reply.status(404).send({ error: 'User not found' })
    return reply.send({ user })
  })

  const auth = { preHandler: [fastify.authenticate] }

  // List all users paginated (admin only)
  fastify.get('/users', auth, async (request, reply) => {
    if (request.user.role !== 'ADMIN') return reply.status(403).send({ error: 'Forbidden' })

    const { page = '1' } = request.query as { page?: string }
    const pageNum = Math.max(1, parseInt(page, 10) || 1)
    const PAGE_SIZE = 50

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.user.count(),
    ])

    return reply.send({ users, total, page: pageNum, pages: Math.ceil(total / PAGE_SIZE) })
  })

  // Change a user's role (admin only)
  fastify.patch('/users/:id/role', auth, async (request, reply) => {
    if (request.user.role !== 'ADMIN') return reply.status(403).send({ error: 'Forbidden' })

    const { id } = request.params as { id: string }
    const { role } = request.body as { role: 'ADMIN' | 'PLAYER' }

    if (!['ADMIN', 'PLAYER'].includes(role)) return reply.status(400).send({ error: 'Invalid role' })
    if (id === request.user.sub) return reply.status(400).send({ error: 'Cannot change your own role' })

    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    })
    return reply.send({ user })
  })

  // Delete a user (admin only)
  fastify.delete('/users/:id', auth, async (request, reply) => {
    if (request.user.role !== 'ADMIN') return reply.status(403).send({ error: 'Forbidden' })

    const { id } = request.params as { id: string }
    if (id === request.user.sub) return reply.status(400).send({ error: 'Cannot delete yourself' })

    await prisma.user.delete({ where: { id } })
    return reply.status(204).send()
  })
}
