import { z } from "zod";

export const surfaceKindSchema = z.enum(["fsm", "decision", "static"]);

export const uiStateCellSchema = z.object({
  state: z.string(),
  description: z.string(),
  user_visible: z.string(),
  actions: z.array(z.string()).default([]),
});

export const uiTransitionSchema = z.object({
  from: z.string(),
  to: z.string(),
  trigger: z.string(),
});

export const decisionRuleSchema = z.object({
  conditions: z.string(),
  outcome: z.string(),
  cos_ref: z.string().optional(),
});

export const staticRowSchema = z.object({
  item: z.string(),
  target: z.string(),
  note: z.string().optional(),
});

export const steadyStateSchema = z.object({
  state: z.string(),
  description: z.string(),
  user_visible: z.string(),
});

export const acCrossRefSchema = z.object({
  scenario: z.string(),
  test_focus: z.string(),
});

export const uiSurfaceSchema = z.object({
  surface_id: z.string(),
  name: z.string(),
  kind: surfaceKindSchema.default("fsm"),
  cos_refs: z.array(z.string()).default([]),
  entry_condition: z.string().optional(),
  surface_type_note: z.string().optional(),
  steady_states: z.array(steadyStateSchema).optional(),
  states: z.array(uiStateCellSchema).default([]),
  transitions: z.array(uiTransitionSchema).default([]),
  decision_rules: z.array(decisionRuleSchema).optional(),
  static_groups: z
    .array(
      z.object({
        group_name: z.string(),
        rows: z.array(staticRowSchema),
      }),
    )
    .optional(),
  navigation_target: z.string().optional(),
  exclusions_note: z.string().optional(),
});

export const uiStateMatrixResponseSchema = z.object({
  doc_subtitle: z.string().optional(),
  overview_mermaid: z.string().optional(),
  decision_table: z
    .object({
      title: z.string(),
      entry_condition: z.string().optional(),
      columns: z.array(z.string()).min(2),
      rows: z.array(
        z.object({
          cells: z.array(z.string()),
          cos_ref: z.string().optional(),
        }),
      ),
      footnote: z.string().optional(),
    })
    .optional(),
  surfaces: z.array(uiSurfaceSchema).min(1),
  ac_cross_ref: z.array(acCrossRefSchema).optional(),
});

export type UiSurface = z.infer<typeof uiSurfaceSchema>;
export type UiStateMatrixResponse = z.infer<typeof uiStateMatrixResponseSchema>;
