import { z } from "zod";

export const acceptanceCriterionSchema = z.object({
  id: z.string(),
  story_ref: z.string(),
  given: z.string(),
  when: z.string(),
  then: z.string(),
  priority: z.enum(["must", "should", "could"]).default("must"),
  testable: z.boolean().default(true),
});

export const acceptanceCriteriaResponseSchema = z.object({
  criteria: z.array(acceptanceCriterionSchema).min(1),
});

export type AcceptanceCriterion = z.infer<typeof acceptanceCriterionSchema>;
export type AcceptanceCriteriaResponse = z.infer<typeof acceptanceCriteriaResponseSchema>;
