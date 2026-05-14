import { FastifyInstance } from 'fastify'
import { pipeline } from 'stream/promises'
import { createWriteStream } from 'fs'
import { mkdir, unlink } from 'fs/promises'
import { randomUUID } from 'crypto'
import path from 'path'
import { prisma } from '../lib/prisma'
import { CreateSubmissionSchema } from '@zuiphok/shared'

const ALLOWED_MIMETYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
}

const uploadDir = path.resolve(process.env.UPLOAD_DIR ?? 'uploads')

export async function submissionsRoutes(fastify: FastifyInstance) {
  const auth = { preHandler: [fastify.authenticate] }

  // Create a submission (text + GPS — media uploaded separately)
  fastify.post('/submissions', auth, async (request, reply) => {
    const { sub } = request.user
    const result = CreateSubmissionSchema.safeParse(request.body)
    if (!result.success) return reply.status(400).send({ error: result.error.flatten().fieldErrors })

    const { taskId, text, locationLat, locationLng } = result.data

    const task = await prisma.task.findUnique({ where: { id: taskId } })
    if (!task) return reply.status(404).send({ error: 'Task not found' })

    // Derive teamId from the user's membership in this game
    const membership = await prisma.teamMember.findFirst({
      where: { userId: sub, team: { gameId: task.gameId } },
    })
    if (!membership) return reply.status(403).send({ error: 'You are not in a team for this game' })

    const submission = await prisma.submission.create({
      data: {
        taskId,
        teamId: membership.teamId,
        userId: sub,
        text: text ?? null,
        locationLat: locationLat ?? null,
        locationLng: locationLng ?? null,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        media: true,
      },
    })

    ;(fastify as any).io?.to(`team:${membership.teamId}`).emit('submission:created', { submission })

    return reply.status(201).send({ submission })
  })

  // Get submission by ID
  fastify.get('/submissions/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string }
    const submission = await prisma.submission.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true, email: true } }, media: true },
    })
    if (!submission) return reply.status(404).send({ error: 'Submission not found' })
    return reply.send({ submission })
  })

  // List submissions for a task (player sees their team only, admin sees all)
  fastify.get('/tasks/:taskId/submissions', auth, async (request, reply) => {
    const { taskId } = request.params as { taskId: string }
    const { sub, role } = request.user

    const where =
      role === 'ADMIN'
        ? { taskId }
        : { taskId, team: { members: { some: { userId: sub } } } }

    const submissions = await prisma.submission.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true } }, media: true },
      orderBy: { submittedAt: 'desc' },
    })
    return reply.send({ submissions })
  })

  // List submissions for a team
  fastify.get('/teams/:teamId/submissions', auth, async (request, reply) => {
    const { teamId } = request.params as { teamId: string }
    const submissions = await prisma.submission.findMany({
      where: { teamId },
      include: { user: { select: { id: true, name: true, email: true } }, media: true, task: { select: { id: true, title: true } } },
      orderBy: { submittedAt: 'desc' },
    })
    return reply.send({ submissions })
  })

  // Upload media to an existing submission
  fastify.post('/submissions/:id/media', auth, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { sub } = request.user

    const submission = await prisma.submission.findFirst({ where: { id, userId: sub } })
    if (!submission) return reply.status(404).send({ error: 'Submission not found' })

    const data = await request.file()
    if (!data) return reply.status(400).send({ error: 'No file provided' })

    const ext = ALLOWED_MIMETYPES[data.mimetype]
    if (!ext) return reply.status(400).send({ error: `Unsupported file type: ${data.mimetype}` })

    const fileName = `${randomUUID()}.${ext}`
    const submissionDir = path.join(uploadDir, submission.id)
    await mkdir(submissionDir, { recursive: true })
    const filePath = path.join(submissionDir, fileName)

    await pipeline(data.file, createWriteStream(filePath))

    const relPath = `${submission.id}/${fileName}`
    const media = await prisma.media.create({
      data: { submissionId: id, filePath: relPath, mimeType: data.mimetype },
    })

    return reply.status(201).send({ media })
  })

  // Delete a media file
  fastify.delete('/media/:mediaId', auth, async (request, reply) => {
    const { mediaId } = request.params as { mediaId: string }
    const { sub } = request.user

    const media = await prisma.media.findFirst({
      where: { id: mediaId, submission: { userId: sub } },
    })
    if (!media) return reply.status(404).send({ error: 'Media not found' })

    try {
      await unlink(path.join(uploadDir, media.filePath))
    } catch { /* file may already be gone */ }

    await prisma.media.delete({ where: { id: mediaId } })
    return reply.status(204).send()
  })
}
