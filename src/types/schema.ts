import { z } from "zod";

export const LocatorSchema = z.object({
  type: z.enum(["testId", "ariaLabel", "text", "xpath", "css"]),
  value: z.string(),
});

export const CheckpointSchema = z.object({
  condition: z.enum(["url_matches", "element_visible", "text_present"]),
  value: z.string(),
  locator: z.array(LocatorSchema).optional(),
});

export const StepSchema = z.object({
  id: z.string(),
  description: z.string(),
  action: z.enum(["click", "type", "navigate", "extract", "wait", "verify"]),
  locators: z.array(LocatorSchema).optional(),
  inputParameter: z.string().optional(),
  value: z.string().optional(),
  outputKey: z.string().optional(),
  url: z.string().optional(),
  checkpoint: CheckpointSchema.optional()
});

export const CapabilityArtifactSchema = z.object({
  version: z.literal("1.0"),
  name: z.string(),
  description: z.string(),
  entryUrl: z.string(),
  inputSchema: z.record(z.string(), z.string()),
  outputSchema: z.record(z.string(), z.string()),
  steps: z.array(StepSchema),
});

export type CapabilityArtifact = z.infer<typeof CapabilityArtifactSchema>;
export type Step = z.infer<typeof StepSchema>;
export type Locator = z.infer<typeof LocatorSchema>;
export type Checkpoint = z.infer<typeof CheckpointSchema>;
