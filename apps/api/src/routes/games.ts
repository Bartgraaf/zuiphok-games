import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { CreateGameSchema, UpdateGameSchema, ChangeGameStatusSchema } from '@zuiphok/shared'

export async function gamesRoutes(fastify: FastifyInstance) {
  const auth = { preHandler: [fastify.authenticate] }

  // List games — admin sees all, player sees games they're in
  fastify.get('/', auth, async (request, reply) => {
    const { sub, role } = request.user

    if (role === 'ADMIN') {
      const games = await prisma.game.findMany({
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { teams: true, tasks: true } } },
      })
      return reply.send({ games })
    }

    const games = await prisma.game.findMany({
      where: {
        teams: { some: { members: { some: { userId: sub } } } },
      },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { teams: true, tasks: true } } },
    })
    return reply.send({ games })
  })

  // Find game by invite code (lookup before joining)
  fastify.get('/find', auth, async (request, reply) => {
    const { code } = request.query as { code?: string }
    if (!code) return reply.status(400).send({ error: 'code is required' })

    const game = await prisma.game.findUnique({
      where: { inviteCode: code },
      include: {
        teams: { include: { _count: { select: { members: true } } } },
        _count: { select: { tasks: true } },
      },
    })

    if (!game) return reply.status(404).send({ error: 'Invalid invite code' })
    if (game.status === 'FINISHED') return reply.status(410).send({ error: 'Game has ended' })

    return reply.send({ game })
  })

  // Get game by ID with full details
  fastify.get('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { sub, role } = request.user

    const game = await prisma.game.findUnique({
      where: { id },
      include: {
        tasks: { orderBy: { createdAt: 'asc' }, include: { _count: { select: { submissions: true } } } },
        teams: {
          include: {
            _count: { select: { members: true } },
            members: { include: { user: { select: { id: true, name: true, email: true } } } },
          },
        },
        _count: { select: { teams: true, tasks: true } },
      },
    })

    if (!game) return reply.status(404).send({ error: 'Game not found' })

    if (role !== 'ADMIN') {
      const isMember = game.teams.some((t) => t.members.some((m) => m.userId === sub))
      if (!isMember) return reply.status(403).send({ error: 'You are not a member of this game' })
    }

    return reply.send({ game })
  })

  // Create game (admin only)
  fastify.post('/', auth, async (request, reply) => {
    if (request.user.role !== 'ADMIN') return reply.status(403).send({ error: 'Forbidden' })

    const result = CreateGameSchema.safeParse(request.body)
    if (!result.success) return reply.status(400).send({ error: result.error.flatten().fieldErrors })

    const game = await prisma.game.create({
      data: result.data,
      include: { _count: { select: { teams: true, tasks: true } } },
    })
    return reply.status(201).send({ game })
  })

  // Update game (admin only)
  fastify.patch('/:id', auth, async (request, reply) => {
    if (request.user.role !== 'ADMIN') return reply.status(403).send({ error: 'Forbidden' })

    const { id } = request.params as { id: string }
    const result = UpdateGameSchema.safeParse(request.body)
    if (!result.success) return reply.status(400).send({ error: result.error.flatten().fieldErrors })

    const game = await prisma.game.update({ where: { id }, data: result.data })
    return reply.send({ game })
  })

  // Change game status (admin only)
  fastify.patch('/:id/status', auth, async (request, reply) => {
    if (request.user.role !== 'ADMIN') return reply.status(403).send({ error: 'Forbidden' })

    const { id } = request.params as { id: string }
    const result = ChangeGameStatusSchema.safeParse(request.body)
    if (!result.success) return reply.status(400).send({ error: result.error.flatten().fieldErrors })

    const game = await prisma.game.update({ where: { id }, data: { status: result.data.status } })
    ;(fastify as any).io?.to(`game:${id}`).emit('game:status_changed', { gameId: id, status: game.status })
    return reply.send({ game })
  })

  // Delete game (admin only)
  fastify.delete('/:id', auth, async (request, reply) => {
    if (request.user.role !== 'ADMIN') return reply.status(403).send({ error: 'Forbidden' })

    const { id } = request.params as { id: string }
    await prisma.game.delete({ where: { id } })
    return reply.status(204).send()
  })
}
