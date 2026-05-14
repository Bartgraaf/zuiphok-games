import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
import staticFiles from '@fastify/static'
import { Server } from 'socket.io'
import path from 'path'
import fs from 'fs'
import { authRoutes } from './routes/auth'
import { gamesRoutes } from './routes/games'
import { teamsRoutes } from './routes/teams'
import { tasksRoutes } from './routes/tasks'
import { submissionsRoutes } from './routes/submissions'

const fastify = Fastify({
  ignoreTrailingSlash: true,
  logger: {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true },
    },
  },
})

const uploadDir = path.resolve(process.env.UPLOAD_DIR ?? 'uploads')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

async function bootstrap() {
  await fastify.register(cors, { origin: true, credentials: true })

  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
  })

  fastify.decorate('authenticate', async (request: any, reply: any) => {
    try {
      await request.jwtVerify()
    } catch {
      reply.status(401).send({ error: 'Unauthorized' })
    }
  })

  await fastify.register(multipart, {
    limits: { fileSize: 100 * 1024 * 1024 },
  })

  await fastify.register(staticFiles, {
    root: uploadDir,
    prefix: '/uploads/',
  })

  await fastify.register(authRoutes, { prefix: '/auth' })
  await fastify.register(gamesRoutes, { prefix: '/games' })
  await fastify.register(teamsRoutes)
  await fastify.register(tasksRoutes)
  await fastify.register(submissionsRoutes)

  fastify.get('/health', async () => ({ status: 'ok' }))

  const port = parseInt(process.env.PORT ?? '3001')
  await fastify.listen({ port, host: '0.0.0.0' })

  const io = new Server(fastify.server, { cors: { origin: '*' } })

  io.on('connection', (socket) => {
    fastify.log.info(`Socket connected: ${socket.id}`)
    socket.on('join:game', (gameId: string) => socket.join(`game:${gameId}`))
    socket.on('join:team', (teamId: string) => socket.join(`team:${teamId}`))
    socket.on('disconnect', () => fastify.log.info(`Socket disconnected: ${socket.id}`))
  })

  ;(fastify as any).io = io
}

bootstrap().catch((err) => {
  console.error(err)
  process.exit(1)
})
