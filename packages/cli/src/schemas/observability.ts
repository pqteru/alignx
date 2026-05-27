import { z } from "zod";

export const eventSchema = z.object({
  name: z.string(),
  category: z.string(),
  trigger: z.string(),
  properties: z.array(z.string()).default([]),
  pii_risk: z.enum(["none", "low", "medium", "high"]).default("low"),
  sampling: z.string().default("100%"),
  owner: z.string().optional(),
  related_surface: z.string().optional(),
});

export const metricSchema = z.object({
  name: z.string(),
  type: z.enum(["counter", "gauge", "histogram", "ratio"]),
  definition: z.string(),
  target: z.string().optional(),
  dimensions: z.array(z.string()).default([]),
});

export const alertSchema = z.object({
  name: z.string(),
  condition: z.string(),
  severity: z.enum(["info", "warning", "critical"]),
  action: z.string(),
});

export const observabilityResponseSchema = z.object({
  objective: z.string(),
  north_star: z.string().optional(),
  events: z.array(eventSchema).min(4),
  metrics: z.array(metricSchema).min(3),
  alerts: z.array(alertSchema).default([]),
  dashboards: z.array(z.string()).default([]),
  retention_notes: z.array(z.string()).default([]),
  feedback_loop: z.array(z.string()).default([]),
});

export type ObservabilityResponse = z.infer<typeof observabilityResponseSchema>;
