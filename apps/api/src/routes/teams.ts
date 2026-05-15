import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { CreateTeamSchema } from '@zuiphok/shared'

export async function teamsRoutes(fastify: FastifyInstance) {
  const auth = { preHandler: [fastify.authenticate] }

  // List teams in a game
  fastify.get('/games/:gameId/teams', auth, async (request, reply) => {
    const { gameId } = request.params as { gameId: string }

    const teams = await prisma.team.findMany({
      where: { gameId },
      include: {
        _count: { select: { members: true } },
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    })
    return reply.send({ teams })
  })

  // Create team in a game (admin only)
  fastify.post('/games/:gameId/teams', auth, async (request, reply) => {
    if (request.user.role !== 'ADMIN') return reply.status(403).send({ error: 'Forbidden' })

    const { gameId } = request.params as { gameId: string }
    const result = CreateTeamSchema.safeParse(request.body)
    if (!result.success) return reply.status(400).send({ error: result.error.flatten().fieldErrors })

    const game = await prisma.game.findUnique({ where: { id: gameId } })
    if (!game) return reply.status(404).send({ error: 'Game not found' })

    const team = await prisma.team.create({
      data: { name: result.data.name, gameId },
      include: { _count: { select: { members: true } } },
    })

    ;(fastify as any).io?.to(`game:${gameId}`).emit('team:created', { team })
    return reply.status(201).send({ team })
  })

  // Get team by ID
  fastify.get('/teams/:teamId', auth, async (request, reply) => {
    const { teamId } = request.params as { teamId: string }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        game: { select: { id: true, name: true, status: true } },
        _count: { select: { members: true } },
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    })

    if (!team) return reply.status(404).send({ error: 'Team not found' })
    return reply.send({ team })
  })

  // Join a team
  fastify.post('/teams/:teamId/join', auth, async (request, reply) => {
    const { sub } = request.user
    const { teamId } = request.params as { teamId: string }

    const team = await prisma.team.findUnique({ where: { id: teamId }, include: { game: true } })
    if (!team) return reply.status(404).send({ error: 'Team not found' })
    if (team.game.status === 'FINISHED') return reply.status(410).send({ error: 'Game has ended' })

    // Prevent joining multiple teams in the same game
    const existing = await prisma.teamMember.findFirst({
      where: { userId: sub, team: { gameId: team.gameId } },
    })
    if (existing) return reply.status(409).send({ error: 'You are already in a team for this game' })

    const member = await prisma.teamMember.create({
      data: { userId: sub, teamId },
      include: { user: { select: { id: true, name: true, email: true } } },
    })

    ;(fastify as any).io?.to(`team:${teamId}`).emit('team:member_joined', { teamId, member })
    return reply.status(201).send({ member })
  })

  // Leave / remove from team
  fastify.delete('/teams/:teamId/members/:userId', auth, async (request, reply) => {
    const { sub, role } = request.user
    const { teamId, userId } = request.params as { teamId: string; userId: string }

    if (role !== 'ADMIN' && sub !== userId) return reply.status(403).send({ error: 'Forbidden' })

    await prisma.teamMember.deleteMany({ where: { teamId, userId } })
    return reply.status(204).send()
  })

  // Move player to a different team (admin only)
  fastify.patch('/games/:gameId/players/:userId/team', auth, async (request, reply) => {
    if (request.user.role !== 'ADMIN') return reply.status(403).send({ error: 'Forbidden' })

    const { gameId, userId } = request.params as { gameId: string; userId: string }
    const { teamId } = request.body as { teamId: string }

    if (!teamId) return reply.status(400).send({ error: 'teamId is required' })

    // Verify target team belongs to this game
    const targetTeam = await prisma.team.findFirst({ where: { id: teamId, gameId } })
    if (!targetTeam) return reply.status(404).send({ error: 'Team not found in this game' })

    await prisma.$transaction([
      prisma.teamMember.deleteMany({ where: { userId, team: { gameId } } }),
      prisma.teamMember.create({ data: { userId, teamId } }),
    ])

    return reply.send({ ok: true })
  })
}
