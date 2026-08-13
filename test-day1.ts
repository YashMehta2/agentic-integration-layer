import { CapabilityArtifactSchema } from "./src/types/schema";
import { chromium } from "playwright";
import * as path from "path";

async function run() {
  console.log("=== Testing Day 1 Artifact Schema ===");
  
  // 1. Create a dummy artifact to test our Zod schema
  const dummyArtifact = {
    version: "1.0",
    name: "Lookup Member",
    description: "Looks up a member by ID and gets balance",
    entryUrl: "file://" + path.join(__dirname, "mock-app/index.html").replace(/\\/g, "/"),
    inputSchema: { memberId: "string" },
    outputSchema: { balance: "string" },
    steps: [
      {
        id: "step1",
        description: "Type Member ID",
        action: "type",
        locators: [{ type: "css", value: ".txt-input-992" }],
        inputParameter: "memberId"
      },
      {
        id: "step2",
        description: "Click Search",
        action: "click",
        locators: [{ type: "text", value: "SEARCH" }]
      }
    ]
  };

  // Validate it
  const parseResult = CapabilityArtifactSchema.safeParse(dummyArtifact);
  if (parseResult.success) {
    console.log("✅ Schema Validation Passed! Artifact shape is valid.");
  } else {
    console.error("❌ Schema Validation Failed:", parseResult.error);
    return;
  }

  console.log("\n=== Testing Day 1 Playwright Environment & Mock App ===");
  // 2. Test Playwright and the Mock App
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const appPath = "file://" + path.join(__dirname, "mock-app", "index.html").replace(/\\/g, "/");
  console.log("Navigating to Mock App:", appPath);
  
  await page.goto(appPath);
  
  console.log("Typing Member ID: 12345");
  await page.fill('.txt-input-992', '12345');
  
  console.log("Clicking Search...");
  await page.click('.btn-submit');
  
  // Wait for the results table to become visible (mock delay is 800ms)
  await page.waitForSelector('#results-table', { state: 'visible' });
  
  const name = await page.innerText('#res-name');
  const balance = await page.innerText('.balance-val');
  
  console.log(`✅ App responded successfully! Name: ${name}, Balance: ${balance}`);
  
  await browser.close();
  console.log("\nAll Day 1 components are working perfectly.");
}

run().catch(console.error);
