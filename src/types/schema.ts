import { z } from "zod";

/**
 * Locator Strategy
 * We store multiple locators for a single element to allow for robust fallback mechanisms
 * during deterministic replay.
 */
export const LocatorSchema = z.object({
  type: z.enum(["testId", "ariaLabel", "text", "xpath", "css"]),
  value: z.string(),
});

export const CheckpointSchema = z.object({
  condition: z.enum(["url_matches", "element_visible", "text_present"]),
  value: z.string(),
  locator: z.array(LocatorSchema).optional(), // Used if condition is element_visible
});

export const StepSchema = z.object({
  id: z.string(),
  description: z.string(),
  action: z.enum(["click", "type", "navigate", "extract", "wait", "verify"]),
  
  // Locators (ordered by preference)
  locators: z.array(LocatorSchema).optional(), 
  
  // For 'type' actions
  inputParameter: z.string().optional(), // Binds to an input param (e.g., 'memberId')
  value: z.string().optional(),          // Hardcoded value if not parameterized
  
  // For 'extract' actions
  outputKey: z.string().optional(),      // Binds to an output schema key
  
  // For 'navigate' actions
  url: z.string().optional(),

  // After this step completes, we optionally verify a state
  checkpoint: CheckpointSchema.optional()
});

/**
 * Capability Artifact Schema
 * The structured, versioned, replayable output of a successful discovery run.
 */
export const CapabilityArtifactSchema = z.object({
  version: z.literal("1.0"),
  name: z.string(),
  description: z.string(),
  entryUrl: z.string(),
  
  // Expected shape of inputs to run this capability
  inputSchema: z.record(z.string(), z.string()), // e.g., { "memberId": "string" }
  
  // Expected shape of extracted outputs
  outputSchema: z.record(z.string(), z.string()), // e.g., { "balance": "string" }
  
  steps: z.array(StepSchema),
});

export type CapabilityArtifact = z.infer<typeof CapabilityArtifactSchema>;
export type Step = z.infer<typeof StepSchema>;
export type Locator = z.infer<typeof LocatorSchema>;
export type Checkpoint = z.infer<typeof CheckpointSchema>;
