import { z } from 'zod'

export const CreateTaskSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(200),
  description: z.string().max(2000).optional(),
  taskType: z.enum(['TEXT', 'PHOTO', 'VIDEO', 'MIXED']),
  points: z.number().int().min(1).max(1000).default(10),
  requiresLocation: z.boolean().default(false),
  timeLimit: z.number().int().min(1).max(480).optional().nullable(),
})

export const UpdateTaskSchema = CreateTaskSchema.partial()

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>
