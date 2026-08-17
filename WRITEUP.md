# Interface.ai Computer-Use Automation System

## 1. Architecture
The system is divided into two distinct phases to optimize for both adaptability and cost-efficiency:
*   **Discovery Phase (Agentic):** Uses an LLM (Gemini) equipped with Playwright to explore a target application, determine the necessary steps to achieve a specific user goal, and generate a standardized JSON `CapabilityArtifact`. This phase is slow and expensive but highly adaptable to new UIs.
*   **Replay Phase (Deterministic):** A lightweight Playwright execution engine that blindly reads the generated `CapabilityArtifact` and executes the steps sequentially. This phase bypasses the LLM entirely, resulting in sub-second execution times and zero token costs, perfectly suited for high-volume, repetitive tasks.

## 2. Artifact Schema
The `CapabilityArtifact` serves as the rigid contract between the Discovery and Replay phases. It is strictly typed using Zod (`src/types/schema.ts`).
*   **Top-level:** Contains metadata (version, goal description) and typed schemas for inputs (e.g., `memberId`) and outputs (e.g., `balance`).
*   **Steps Array:** Each step dictates an `action` (type, click, extract, wait, escalate) and relies on a `Locator` object.
*   **Parameterization:** Steps can bind values to the `inputSchema` via `inputParameter` or map scraped data to the `outputSchema` via `outputKey`, allowing the same artifact to be reused dynamically (e.g., searching for different members).

## 3. Determinism & Error Handling
Replay determinism is achieved by strictly relying on Playwright's built-in auto-waiting mechanisms and explicitly waiting for selectors before extraction. 
*   **Locator Fallbacks:** While the current implementation uses single CSS or Text locators for simplicity, the schema explicitly supports arrays of locators (`locators: Locator[]`) to allow the engine to gracefully fall back if an ID changes.
*   **Error Handling:** If an element cannot be found within the timeout during Replay, the engine safely terminates the run and throws a clear exception, preventing unpredictable state mutations.

## 4. Heterogeneity
The system is designed to handle diverse target applications by standardizing the DOM before it reaches the LLM. 
*   During Discovery, `getSimplifiedDOM` strips out `<script>`, `<style>`, and SVG noise, presenting the LLM with a clean representation of the interactive elements.
*   I explicitly synchronize input `value` properties back to HTML attributes so the LLM can perceive state changes in modern SPAs (Single Page Applications) that don't inherently reflect input values in the DOM string.

## 5. Escalation
Human-in-the-loop (HITL) handoff is supported via the `escalate` action in the schema.
If the LLM encounters a CAPTCHA, MFA prompt, or an ambiguous edge case during Discovery, it can output `{ "action": "escalate" }`. The system halts, alerts the operator via the terminal, allows the human to interact directly with the live Chrome window, and resumes automation seamlessly once control is handed back via a terminal prompt.

## 6. Safety
Safety is enforced by isolating the execution environments and strictly limiting the action space.
*   The LLM is constrained to a predefined set of read/write actions (`type`, `click`, `extract`). It cannot execute arbitrary JavaScript or shell commands.
*   The Replay engine only parses validated JSON, preventing prompt injection attacks during playback.
*   During Discovery, all operations are conducted in a tightly scoped browser instance, meaning the agent has no access to the underlying OS or file system.

## 7. Cuts
Due to the constraints of the 4-day timeframe, several enhancements were deferred:
1.  **Multiple Locator Fallbacks:** The LLM currently only provides one locator per step. A production system would instruct the LLM to provide CSS, XPath, and aria-labels simultaneously to increase replay resilience.
2.  **Visual Processing:** The current DOM-only approach struggles with canvas-rendered UIs. Upgrading to a multimodal approach (feeding screenshots to Gemini) would vastly improve capability.
3.  **Self-Healing:** If a Replay fails, a robust system would automatically trigger a localized mini-Discovery run to repair the broken step and update the artifact, rather than completely failing.
