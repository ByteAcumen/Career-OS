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

function matchGlob(file: string, glob: string) {
  // Simple glob to regex conversion:
  // src/api/** -> ^src/api/.*$
  const regexString = "^" + glob.replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*") + "$";
  const regex = new RegExp(regexString);
  return regex.test(file);
}

function getAgentClaims(agentName: string) {
  const claimPath = path.join(CLAIMS_DIR, `${agentName}.json`);
  if (!fs.existsSync(claimPath)) return { exact: new Set<string>(), globs: [] };
  const content = JSON.parse(fs.readFileSync(claimPath, "utf-8"));
  
  const allPatterns = [...(content.files || []), ...(content.available || [])];
  const globs = allPatterns.filter(f => f.includes("*"));
  const exact = new Set(allPatterns.filter(f => !f.includes("*")));
  return { exact, globs };
}

function checkClaims() {
  console.log("🔍 Checking file claims...");
  const claimsFiles = fs.readdirSync(CLAIMS_DIR).filter(f => f.endsWith(".json"));
  const allAgents = claimsFiles.map(f => f.replace(".json", ""));

  // This check is simplified: it could be O(N^2) over globs if we were strict,
  // but for now we enforce at file modification time rather than static overlap checking.
  console.log("✅ Claim definition loaded.");
}

function getCurrentAgent(): string | null {
  const currentBranch = runCommand("git branch --show-current").trim();
  if (currentBranch === "antigravity/work") return "antigravity";
  if (currentBranch === "codex/work") return "codex";
  if (currentBranch === "main") {
    console.warn("⚠️ Running on 'main' branch. Branch isolation is disabled.");
    return null; // Bypass strict branch enforcement for main
  }
  console.error(`❌ Unknown branch '${currentBranch}'. Please checkout antigravity/work or codex/work.`);
  process.exit(1);
}

function syncGit(agentName: string | null) {
  console.log("🔄 Syncing git state...");
  const statusRaw = runCommand("git status --porcelain").trim();
  if (statusRaw.length === 0) {
    console.log("✅ Git is clean.");
    return;
  }

  const changedFiles = statusRaw.split("\n").map(line => {
    // line format e.g. " M path", "?? path"
    const pathSegments = line.trim().split(" ");
    return pathSegments[pathSegments.length - 1].replace(/"/g, "");
  });

  if (agentName) {
    const claims = getAgentClaims(agentName);
    const unownedFiles: string[] = [];

    for (const file of changedFiles) {
      if (file.startsWith(".agents/")) continue;
      
      let isClaimed = claims.exact.has(file);
      if (!isClaimed) {
        for (const glob of claims.globs) {
          if (matchGlob(file, glob)) {
            isClaimed = true;
            break;
          }
        }
      }

      if (!isClaimed) {
        unownedFiles.push(file);
      }
    }

    if (unownedFiles.length > 0) {
      console.error(`\n❌ SECURITY: Agent '${agentName}' modified files it does not own!`);
      unownedFiles.forEach(f => console.error(`   - ${f}`));
      console.error("\nPlease revert these files or update your .agents/claims.json to claim them.");
      process.exit(1);
    }

    console.log(`✅ All ${changedFiles.length} changed files belong to '${agentName}'.`);
    
    // Only add and commit paths owned by this agent (or .agents config)
    for (const file of changedFiles) {
      runCommand(`git add "${file}"`);
    }
  } else {
    // If running on main/unbound, just add all
    runCommand("git add .");
  }

  runCommand(`git commit -m "chore(${agentName || 'user'}): auto-checkpoint before sync"`);
  console.log("✅ Changes safely committed.");
}

function processHandoffs() {
  console.log("📬 Processing handoffs...");
  if (!fs.existsSync(HANDOFFS_DIR)) return;

  const handoffs = fs.readdirSync(HANDOFFS_DIR).filter(f => f.endsWith(".json") && !f.startsWith("template"));
  
  if (handoffs.length === 0) {
    console.log("   No new handoffs.");
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

function main() {
  console.log("🤖 Career-OS Multi-Agent Coordinator 🤖\n");
  
  if (!fs.existsSync(AGENTS_DIR)) {
    console.error("❌ .agents directory not found.");
    process.exit(1);
  }
  
  const currentAgent = getCurrentAgent();
  if (currentAgent) {
    console.log(`📍 Current Agent Context: ${currentAgent}`);
  }

  checkClaims();
  syncGit(currentAgent);
  processHandoffs();
  
  console.log("\n🚀 Coordination complete. Ready for next turn.");
}

main();
