# Agentic Integration Layer

A robust, enterprise-ready automation engine that dynamically learns how to execute user goals via a web browser using an LLM, and produces a highly deterministic replay artifact that can be executed natively at scale.

## Architecture

This system addresses the challenge of brittle web scraping and unscalable API integrations by bridging the gap between dynamic LLM agents and fast, deterministic playwright automation.

1.  **Discovery Engine (`src/discovery`)**: Uses Gemini 3.5 Flash and Playwright to navigate a target interface, deduce how to achieve a user goal (e.g., extracting a member balance), and serializes the exact sequence of actions into a reusable JSON Capability Artifact. It includes Human-in-the-Loop (HITL) escalation capabilities for complex blockers.
2.  **Replay Engine (`src/replay`)**: A lightweight, LLM-free execution engine. It accepts a Capability Artifact and input parameters, executing the sequence headless, deterministically, and fast, outputting structured data.

## Getting Started

### Prerequisites
- Node.js (v18+)
- Playwright browsers installed (`npx playwright install chromium`)

### Installation

```bash
npm install
```

### Configuration
Create a `.env` file in the root directory and add your Gemini API key:
```env
GEMINI_API_KEY="your-api-key-here"
```

## Usage

The project provides a unified CLI to trigger both engines.

### 1. Discovery Phase
Run the discovery agent against a target URL to generate the Capability Artifact.
```bash
npx tsx src/cli.ts discovery --goal "Look up member 12345 and extract their current balance" --url "http://example.com/login"
```
*Note: A mock application is provided in `mock-app/index.html` for local testing.*

### 2. Replay Phase
Run the headless execution engine using the generated artifact, passing dynamic inputs via JSON.
```bash
npx tsx src/cli.ts replay --artifact "./evidence/discovery_run.json" --inputs "{\"targetInput\": \"99999\"}"
```

## Artifact Schema
The `CapabilityArtifact` defines the contract. It maps inputs/outputs and strictly types browser actions (`type`, `click`, `extract`, `escalate`, `wait`). View `src/types/schema.ts` for the complete Zod type definitions.
