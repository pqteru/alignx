import { z } from "zod";

export const backlogTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  story_ref: z.string(),
  estimate_points: z.number().int().min(0).max(21),
  depends_on: z.array(z.string()),
  definition_of_done: z.array(z.string()),
});

export const sprintBacklogResponseSchema = z.object({
  sprint_name: z.string(),
  sprint_goal: z.string(),
  velocity_points: z.number().int().min(0),
  tasks: z.array(backlogTaskSchema).min(1),
});

export type BacklogTask = z.infer<typeof backlogTaskSchema>;
export type SprintBacklogResponse = z.infer<typeof sprintBacklogResponseSchema>;
