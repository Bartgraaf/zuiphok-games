import { z } from 'zod'

export const CreateSubmissionSchema = z.object({
  taskId: z.string().min(1),
  text: z.string().max(5000).optional(),
  locationLat: z.number().min(-90).max(90).optional().nullable(),
  locationLng: z.number().min(-180).max(180).optional().nullable(),
})

export type CreateSubmissionInput = z.infer<typeof CreateSubmissionSchema>
