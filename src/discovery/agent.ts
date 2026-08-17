import { chromium, Page } from "playwright";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { SYSTEM_PROMPT } from "./prompts";
import { CapabilityArtifact, Step, Locator } from "../types/schema";

dotenv.config({ path: path.join(__dirname, "../../.env") });

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

async function getSimplifiedDOM(page: Page): Promise<string> {
    return await page.evaluate(() => {
        document.querySelectorAll('input').forEach(input => {
            input.setAttribute('value', input.value);
        });
        
        const clone = document.body.cloneNode(true) as HTMLElement;
        const scripts = clone.querySelectorAll('script, style, svg, noscript');
        scripts.forEach(s => s.remove());
        
        return clone.innerHTML
            .replace(/\s+/g, ' ')
            .replace(/<!--.*?-->/g, '')
            .trim();
    });
}

export async function runDiscovery(goal: string, entryUrl: string): Promise<CapabilityArtifact | undefined> {
    const browser = await chromium.launch({ headless: false }); 
    const page = await browser.newPage();
    await page.goto(entryUrl);
    
    const recordedSteps: Step[] = [];
    let isDone = false;
    let stepCount = 0;
    const MAX_STEPS = 10;
    
    while (!isDone && stepCount < MAX_STEPS) {
        stepCount++;
        
        const dom = await getSimplifiedDOM(page);
        const prompt = `USER GOAL: ${goal}\n\nCURRENT DOM:\n${dom}`;
        
        const model = ai.getGenerativeModel({
            model: "gemini-3.5-flash",
            systemInstruction: SYSTEM_PROMPT,
            generationConfig: { responseMimeType: "application/json" }
        });
        
        const response = await model.generateContent(prompt);
        const rawText = response.response.text();
        if (!rawText) throw new Error("No response from Gemini");
        
        let decisionText = rawText;
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            decisionText = jsonMatch[0];
        }
        
        let decision;
        try {
            decision = JSON.parse(decisionText);
        } catch (e) {
            break;
        }
        
        if (decision.action === "done") {
            isDone = true;
            break;
        }
        
        const stepId = `step_${stepCount}`;
        const step: Step = {
            id: stepId,
            description: decision.thought,
            action: decision.action,
            locators: decision.locator ? [decision.locator as Locator] : undefined,
        };
        
        try {
            if (decision.action === "type") {
                if (decision.locator.type === 'css') {
                    await page.fill(decision.locator.value, decision.value);
                }
                step.value = decision.value;
                step.inputParameter = "targetInput"; 
            } 
            else if (decision.action === "click") {
                if (decision.locator.type === 'text') {
                    await page.click(`text="${decision.locator.value}"`);
                } else {
                    await page.click(decision.locator.value);
                }
            }
            else if (decision.action === "extract") {
                if (decision.locator.type === 'css') {
                    await page.innerText(decision.locator.value);
                }
                step.outputKey = decision.outputKey || "extractedData";
            }
            else if (decision.action === "wait") {
                await page.waitForTimeout(2000);
            }
            else if (decision.action === "escalate") {
                await new Promise<void>(resolve => {
                    process.stdin.once('data', () => resolve());
                });
            }
            
            recordedSteps.push(step);
            await page.waitForTimeout(1000); 
            
        } catch (error) {
            break;
        }
    }
    
    await browser.close();
    
    if (isDone) {
        const capabilityArtifact: CapabilityArtifact = {
            version: "1.0",
            name: "Automated Capability",
            description: goal,
            entryUrl: entryUrl,
            inputSchema: { targetInput: "string" },
            outputSchema: { extractedData: "string" },
            steps: recordedSteps
        };
        
        const evidenceDir = path.join(__dirname, "../../evidence");
        if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir);
        
        const outputPath = path.join(evidenceDir, "discovery_run.json");
        fs.writeFileSync(outputPath, JSON.stringify(capabilityArtifact, null, 2));

        return capabilityArtifact;
    }
}
