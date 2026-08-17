import { runDiscovery } from "./discovery/agent";
import { runReplay } from "./replay/engine";
import * as path from "path";

const args = process.argv.slice(2);
const command = args[0];

async function main() {
    if (command === "discovery") {
        const goalIndex = args.indexOf("--goal");
        const urlIndex = args.indexOf("--url");
        
        if (goalIndex === -1 || urlIndex === -1) {
            console.error("Usage: npx tsx src/cli.ts discovery --goal <goal> --url <url>");
            process.exit(1);
        }
        
        const goal = args[goalIndex + 1];
        const url = args[urlIndex + 1];
        
        console.log(`Starting Discovery Agent...`);
        await runDiscovery(goal, url);
        console.log(`Discovery Run Finished.`);
    } 
    else if (command === "replay") {
        const artifactIndex = args.indexOf("--artifact");
        const inputsIndex = args.indexOf("--inputs");
        
        if (artifactIndex === -1) {
            console.error("Usage: npx tsx src/cli.ts replay --artifact <path> [--inputs <json>]");
            process.exit(1);
        }
        
        const artifactPath = args[artifactIndex + 1];
        let inputs: Record<string, string> = {};
        
        if (inputsIndex !== -1) {
            try {
                inputs = JSON.parse(args[inputsIndex + 1]);
            } catch (e) {
                console.error("Error: --inputs must be a valid JSON string");
                process.exit(1);
            }
        }
        
        console.log(`Starting Replay Engine...`);
        const result = await runReplay(artifactPath, inputs);
        console.log(`Replay Run Finished. Result:`);
        console.log(JSON.stringify(result, null, 2));
    } 
    else {
        console.log("Usage:");
        console.log("  npx tsx src/cli.ts discovery --goal <goal> --url <url>");
        console.log("  npx tsx src/cli.ts replay --artifact <path> [--inputs <json>]");
        process.exit(1);
    }
}

main().catch(console.error);
