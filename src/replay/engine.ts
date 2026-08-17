import { chromium } from "playwright";
import * as fs from "fs";
import * as path from "path";
import { CapabilityArtifact } from "../types/schema";

export async function runReplay(artifactPath: string, inputs: Record<string, string>): Promise<Record<string, string>> {
    const artifactRaw = fs.readFileSync(artifactPath, "utf-8");
    const capability: CapabilityArtifact = JSON.parse(artifactRaw);
    
    const browser = await chromium.launch({ headless: true }); 
    const page = await browser.newPage();
    
    let currentUrl = capability.entryUrl;
    if (currentUrl.includes("mock-app") && !currentUrl.startsWith("http")) {
        currentUrl = "file://" + path.join(__dirname, "../../mock-app/index.html").replace(/\\/g, "/");
    }
    
    await page.goto(currentUrl);
    
    const extractedData: Record<string, string> = {};
    
    for (let i = 0; i < capability.steps.length; i++) {
        const step = capability.steps[i];
        
        try {
            if (step.action === "type") {
                let textToType = step.value || "";
                if (step.inputParameter && inputs[step.inputParameter]) {
                    textToType = inputs[step.inputParameter];
                }
                
                const loc = step.locator || (step.locators && step.locators[0]);
                if (loc && loc.type === "css") {
                    await page.fill(loc.value, textToType);
                } else if (loc && loc.type === "text") {
                    await page.fill(`text="${loc.value}"`, textToType);
                }
            } 
            else if (step.action === "click") {
                const loc = step.locator || (step.locators && step.locators[0]);
                if (loc && loc.type === "css") {
                    await page.click(loc.value);
                } else if (loc && loc.type === "text") {
                    await page.click(`text="${loc.value}"`);
                }
            } 
            else if (step.action === "extract") {
                const loc = step.locator || (step.locators && step.locators[0]);
                let val = "";
                if (loc && loc.type === "css") {
                    await page.waitForSelector(loc.value, { timeout: 10000 });
                    val = await page.innerText(loc.value);
                }
                const key = step.outputKey || "data";
                extractedData[key] = val.trim();
            }
            else if (step.action === "wait") {
                await page.waitForTimeout(2000);
            }
            
            await page.waitForTimeout(500);
            
        } catch (error) {
            await browser.close();
            throw error;
        }
    }
    
    await browser.close();
    return extractedData;
}
