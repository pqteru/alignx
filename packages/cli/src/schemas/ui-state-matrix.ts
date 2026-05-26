import { z } from "zod";

export const uiStateCellSchema = z.object({
  state: z.string(),
  description: z.string(),
  user_visible: z.string(),
  actions: z.array(z.string()),
});

export const uiSurfaceSchema = z.object({
  surface_id: z.string(),
  name: z.string(),
  states: z.array(uiStateCellSchema).min(1),
  transitions: z.array(
    z.object({
      from: z.string(),
      to: z.string(),
      trigger: z.string(),
    }),
  ),
});

export const uiStateMatrixResponseSchema = z.object({
  surfaces: z.array(uiSurfaceSchema).min(1),
});

export type UiSurface = z.infer<typeof uiSurfaceSchema>;
export type UiStateMatrixResponse = z.infer<typeof uiStateMatrixResponseSchema>;
