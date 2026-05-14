import { z } from 'zod'

export const CreateGameSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  description: z.string().max(1000).optional(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
})

export const UpdateGameSchema = CreateGameSchema.partial()

export const ChangeGameStatusSchema = z.object({
  status: z.enum(['DRAFT', 'ACTIVE', 'FINISHED']),
})

export type CreateGameInput = z.infer<typeof CreateGameSchema>
export type UpdateGameInput = z.infer<typeof UpdateGameSchema>
export type ChangeGameStatusInput = z.infer<typeof ChangeGameStatusSchema>
