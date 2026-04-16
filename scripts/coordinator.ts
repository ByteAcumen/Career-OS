import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

const AGENTS_DIR = path.join(process.cwd(), ".agents");
const CLAIMS_DIR = path.join(AGENTS_DIR, "claims");
const HANDOFFS_DIR = path.join(AGENTS_DIR, "handoffs");
const INBOX_DIR = path.join(AGENTS_DIR, "inbox");

function runCommand(command: string) {
  try {
    return execSync(command, { encoding: "utf8", stdio: "pipe" });
  } catch (error: any) {
    console.error(`Command failed: ${command}`);
    console.error(error.message);
    process.exit(1);
  }
}

function checkClaims() {
  console.log("🔍 Checking file claims...");
  const claimsFiles = fs.readdirSync(CLAIMS_DIR).filter(f => f.endsWith(".json"));
  const allClaimedFiles = new Map<string, string>(); // filePath -> agentName

  let conflictFound = false;

  for (const file of claimsFiles) {
    const claimPath = path.join(CLAIMS_DIR, file);
    const content = JSON.parse(fs.readFileSync(claimPath, "utf-8"));
    const agent = content.agent;

    for (const filePath of content.files || []) {
      if (allClaimedFiles.has(filePath)) {
        console.error(`❌ CONFLICT: '${filePath}' is claimed by both '${allClaimedFiles.get(filePath)}' and '${agent}'.`);
        conflictFound = true;
      } else {
        allClaimedFiles.set(filePath, agent);
      }
    }
  }

  if (conflictFound) {
    console.error("Please resolve conflicts in .agents/claims/ before proceeding.");
    process.exit(1);
  } else {
    console.log("✅ No claim conflicts found.");
  }
}

function processHandoffs() {
  console.log("📬 Processing handoffs...");
  if (!fs.existsSync(HANDOFFS_DIR)) return;

  const handoffs = fs.readdirSync(HANDOFFS_DIR).filter(f => f.endsWith(".json") && !f.startsWith("template"));
  
  if (handoffs.length === 0) {
    console.log("No new handoffs.");
    return;
  }

  for (const file of handoffs) {
    const handoffPath = path.join(HANDOFFS_DIR, file);
    const content = JSON.parse(fs.readFileSync(handoffPath, "utf-8"));
    
    const targetAgent = content.to;
    if (!targetAgent) continue;

    const inboxPath = path.join(INBOX_DIR, `${targetAgent}_inbox.txt`);
    
    const message = `
[${content.timestamp}] From: ${content.from}
Message: ${content.message}
Changed Files: ${content.changedFiles?.join(", ") || "None"}
`;

    fs.appendFileSync(inboxPath, message);
    fs.renameSync(handoffPath, path.join(HANDOFFS_DIR, `processed_${file}`));
    console.log(`✅ Processed handoff from ${content.from} to ${targetAgent}.`);
  }
}

function syncGit() {
  console.log("🔄 Syncing git state...");
  const status = runCommand("git status --porcelain");
  if (status.trim().length > 0) {
    console.log("Uncommitted changes found. Creating checkpoint commit.");
    runCommand("git add .");
    runCommand('git commit -m "chore(agents): auto-checkpoint before sync"');
  }
  console.log("✅ Git is clean.");
}

function main() {
  console.log("🤖 Career-OS Multi-Agent Coordinator 🤖\n");
  
  if (!fs.existsSync(AGENTS_DIR)) {
    console.error("❌ .agents directory not found.");
    process.exit(1);
  }
  
  checkClaims();
  syncGit();
  processHandoffs();
  
  console.log("\n🚀 Coordination complete. Ready for next agent turn.");
}

main();
