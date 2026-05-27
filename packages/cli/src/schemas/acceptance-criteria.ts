import { z } from "zod";

export const coverageRowSchema = z.object({
  scenario: z.string(),
  ac_id: z.string(),
  priority: z.enum(["must", "should", "could"]).default("must"),
  summary: z.string(),
});

export const pendingItemSchema = z.object({
  cos_ref: z.string(),
  note: z.string(),
});

export const acceptanceCriterionSchema = z.object({
  id: z.string(),
  cos_ref: z.string(),
  title: z.string(),
  given: z.string(),
  when: z.string(),
  then: z.string(),
  priority: z.enum(["must", "should", "could"]).default("must"),
  testable: z.boolean().default(true),
  ui_mapping: z.string().optional(),
});

export const testDataCaseSchema = z.object({
  case_id: z.string(),
  title: z.string().optional(),
  preconditions: z.array(z.string()).default([]),
  steps: z.array(z.string()).default([]),
  expected: z.array(z.string()).default([]),
  expected_ac_ids: z.array(z.string()).default([]),
  notes: z.array(z.string()).optional(),
});

export const acUiMappingSchema = z.object({
  ac_ids: z.string(),
  ui_section: z.string(),
});

export const acceptanceCriteriaResponseSchema = z.object({
  user_story_line: z.string().optional(),
  coverage: z.array(coverageRowSchema).optional(),
  pending_items: z.array(pendingItemSchema).optional(),
  criteria: z.array(acceptanceCriterionSchema).min(1),
  test_data: z.array(testDataCaseSchema).optional(),
  ac_ui_mapping: z.array(acUiMappingSchema).optional(),
  flow_mermaid: z.string().optional(),
});

export type AcceptanceCriterion = z.infer<typeof acceptanceCriterionSchema>;
export type AcceptanceCriteriaResponse = z.infer<typeof acceptanceCriteriaResponseSchema>;
