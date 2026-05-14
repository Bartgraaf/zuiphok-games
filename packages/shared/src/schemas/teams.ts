import { z } from 'zod'

export const CreateTeamSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
})

export type CreateTeamInput = z.infer<typeof CreateTeamSchema>
