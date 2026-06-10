import { z } from 'zod'

export const notificationPreferenceSchema = z.object({
  courseUpdates: z.boolean(),
  quizReminders: z.boolean(),
  assignmentDeadlines: z.boolean(),
  communityActivity: z.boolean(),
  weeklyProgressReport: z.boolean(),
  emailNotifications: z.boolean(),
})

export type NotificationPreferenceInput = z.infer<typeof notificationPreferenceSchema>
