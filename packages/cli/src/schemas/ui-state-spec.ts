import { z } from "zod";

export const stateDefSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
  mutual_excludes: z.array(z.string()).default([]),
});

export const specEventSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
});

export const transitionRowSchema = z.object({
  current_state: z.string(),
  event: z.string(),
  next_state: z.string().optional(),
  disposition: z.enum(["allowed", "ignored", "impossible", "error"]).default("allowed"),
  notes: z.string().optional(),
});

export const derivedUiRowSchema = z.object({
  state_id: z.string(),
  render_summary: z.string(),
  ui_elements: z.array(z.string()).default([]),
  must_not_persist: z.array(z.string()).default([]),
});

export const sideEffectRowSchema = z.object({
  id: z.string(),
  kind: z.enum(["api", "navigation", "timer", "storage", "other"]),
  on_event: z.string(),
  description: z.string(),
  emits_event: z.string(),
});

export const invalidStateRowSchema = z.object({
  name: z.string(),
  why_illegal: z.string(),
  prevention: z.string(),
});

export const uiStateSpecResponseSchema = z.object({
  feature_scope: z.string(),
  state_space: z.object({
    modeling_notes: z.string(),
    states: z.array(stateDefSchema).min(2),
  }),
  events: z.object({
    user: z.array(specEventSchema).min(1),
    system: z.array(specEventSchema).default([]),
    async: z.array(specEventSchema).default([]),
  }),
  transitions: z.array(transitionRowSchema).min(4),
  derived_ui: z.array(derivedUiRowSchema).min(2),
  side_effects: z.array(sideEffectRowSchema).default([]),
  invalid_states: z.array(invalidStateRowSchema).min(1),
  state_diagram_mermaid: z.string(),
});

export type UiStateSpecResponse = z.infer<typeof uiStateSpecResponseSchema>;
