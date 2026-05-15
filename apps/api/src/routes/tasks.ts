import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { CreateTaskSchema, UpdateTaskSchema } from '@zuiphok/shared'

export async function tasksRoutes(fastify: FastifyInstance) {
  const auth = { preHandler: [fastify.authenticate] }

  // List tasks in a game
  fastify.get('/games/:gameId/tasks', auth, async (request, reply) => {
    const { gameId } = request.params as { gameId: string }

    const tasks = await prisma.task.findMany({
      where: { gameId },
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { submissions: true } } },
    })
    return reply.send({ tasks })
  })

  // Create task (admin only)
  fastify.post('/games/:gameId/tasks', auth, async (request, reply) => {
    if (request.user.role !== 'ADMIN') return reply.status(403).send({ error: 'Forbidden' })

    const { gameId } = request.params as { gameId: string }
    const result = CreateTaskSchema.safeParse(request.body)
    if (!result.success) return reply.status(400).send({ error: result.error.flatten().fieldErrors })

    const game = await prisma.game.findUnique({ where: { id: gameId } })
    if (!game) return reply.status(404).send({ error: 'Game not found' })

    const task = await prisma.task.create({
      data: { ...result.data, gameId },
      include: { _count: { select: { submissions: true } } },
    })

    ;(fastify as any).io?.to(`game:${gameId}`).emit('task:created', { task })
    return reply.status(201).send({ task })
  })

  // Get task by ID
  fastify.get('/tasks/:taskId', auth, async (request, reply) => {
    const { taskId } = request.params as { taskId: string }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { _count: { select: { submissions: true } } },
    })

    if (!task) return reply.status(404).send({ error: 'Task not found' })
    return reply.send({ task })
  })

  // Update task (admin only)
  fastify.patch('/tasks/:taskId', auth, async (request, reply) => {
    if (request.user.role !== 'ADMIN') return reply.status(403).send({ error: 'Forbidden' })

    const { taskId } = request.params as { taskId: string }
    const result = UpdateTaskSchema.safeParse(request.body)
    if (!result.success) return reply.status(400).send({ error: result.error.flatten().fieldErrors })

    const task = await prisma.task.update({ where: { id: taskId }, data: result.data })
    ;(fastify as any).io?.to(`game:${task.gameId}`).emit('task:updated', { task })
    return reply.send({ task })
  })

  // Delete task (admin only)
  fastify.delete('/tasks/:taskId', auth, async (request, reply) => {
    if (request.user.role !== 'ADMIN') return reply.status(403).send({ error: 'Forbidden' })

    const { taskId } = request.params as { taskId: string }
    const task = await prisma.task.delete({ where: { id: taskId } })
    ;(fastify as any).io?.to(`game:${task.gameId}`).emit('task:deleted', { taskId })
    return reply.status(204).send()
  })

  // Get all completions for a team
  fastify.get('/teams/:teamId/completions', auth, async (request, reply) => {
    const { teamId } = request.params as { teamId: string }
    const completions = await prisma.taskCompletion.findMany({
      where: { teamId },
      include: { markedBy: { select: { id: true, name: true } } },
    })
    return reply.send({ completions })
  })

  // Mark a task complete for a team (admin only)
  fastify.post('/tasks/:taskId/teams/:teamId/complete', auth, async (request, reply) => {
    if (request.user.role !== 'ADMIN') return reply.status(403).send({ error: 'Forbidden' })

    const { taskId, teamId } = request.params as { taskId: string; teamId: string }

    const completion = await prisma.taskCompletion.upsert({
      where: { taskId_teamId: { taskId, teamId } },
      update: { markedById: request.user.sub, markedAt: new Date() },
      create: { taskId, teamId, markedById: request.user.sub },
      include: { markedBy: { select: { id: true, name: true } } },
    })
    return reply.status(201).send({ completion })
  })

  // Unmark a task completion (admin only)
  fastify.delete('/tasks/:taskId/teams/:teamId/complete', auth, async (request, reply) => {
    if (request.user.role !== 'ADMIN') return reply.status(403).send({ error: 'Forbidden' })

    const { taskId, teamId } = request.params as { taskId: string; teamId: string }
    await prisma.taskCompletion.deleteMany({ where: { taskId, teamId } })
    return reply.status(204).send()
  })
}
