import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

const AGENTS_DIR = path.join(process.cwd(), ".agents");
const CLAIMS_DIR = path.join(AGENTS_DIR, "claims");
const HANDOFFS_DIR = path.join(AGENTS_DIR, "handoffs");
const INBOX_DIR = path.join(AGENTS_DIR, "inbox");

type ClaimSet = {
  exact: Set<string>;
  globs: string[];
};

function runCommand(command: string) {
  try {
    return execSync(command, { encoding: "utf8", stdio: "pipe" });
  } catch (error) {
    const err = error as Error;
    console.error(`Command failed: ${command}`);
    console.error(err.message);
    process.exit(1);
  }
}

function matchGlob(file: string, glob: string) {
  const doubleStarToken = "__DOUBLE_STAR__";
  const singleStarToken = "__SINGLE_STAR__";
  const escaped = glob
    .replace(/\*\*/g, doubleStarToken)
    .replace(/\*/g, singleStarToken)
    .replace(/[.+^${}()|[\]\\]/g, "\\$&");
  const regexString = `^${escaped
    .replace(new RegExp(doubleStarToken, "g"), ".*")
    .replace(new RegExp(singleStarToken, "g"), "[^/]*")}$`;
  return new RegExp(regexString).test(file);
}

function getAgentClaims(agentName: string): ClaimSet {
  const claimPath = path.join(CLAIMS_DIR, `${agentName}.json`);
  if (!fs.existsSync(claimPath)) {
    return { exact: new Set<string>(), globs: [] };
  }

  const content = JSON.parse(fs.readFileSync(claimPath, "utf-8")) as {
    files?: string[];
  };
  const patterns = content.files ?? [];

  return {
    exact: new Set(patterns.filter((pattern) => !pattern.includes("*"))),
    globs: patterns.filter((pattern) => pattern.includes("*")),
  };
}

function overlaps(left: ClaimSet, right: ClaimSet) {
  for (const file of left.exact) {
    if (right.exact.has(file) || right.globs.some((glob) => matchGlob(file, glob))) {
      return file;
    }
  }

  for (const file of right.exact) {
    if (left.globs.some((glob) => matchGlob(file, glob))) {
      return file;
    }
  }

  for (const leftGlob of left.globs) {
    if (right.globs.includes(leftGlob)) {
      return leftGlob;
    }
  }

  return null;
}

function checkClaims() {
  console.log("🔍 Checking file claims...");
  const claimFiles = fs.readdirSync(CLAIMS_DIR).filter((file) => file.endsWith(".json"));
  const claimSets = claimFiles.map((file) => {
    const agent = file.replace(".json", "");
    return { agent, claims: getAgentClaims(agent) };
  });

  for (let index = 0; index < claimSets.length; index += 1) {
    const left = claimSets[index];
    for (let compareIndex = index + 1; compareIndex < claimSets.length; compareIndex += 1) {
      const right = claimSets[compareIndex];
      const conflict = overlaps(left.claims, right.claims);
      if (conflict) {
        console.error(
          `❌ CONFLICT: '${conflict}' is claimed by both '${left.agent}' and '${right.agent}'.`,
        );
        process.exit(1);
      }
    }
  }

  console.log("✅ Claim definition loaded.");
}

function getCurrentAgent() {
  const branch = runCommand("git branch --show-current").trim();
  if (branch === "antigravity/work") return "antigravity";
  if (branch === "codex/work") return "codex";

  console.error(`❌ Unknown branch '${branch}'. Please checkout antigravity/work or codex/work.`);
  process.exit(1);
}

function parseChangedFiles() {
  const statusRaw = runCommand("git status --porcelain");
  if (!statusRaw.trim()) return [];

  return statusRaw
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => line.slice(3).trim())
    .map((file) => {
      if (file.includes(" -> ")) {
        return file.split(" -> ").pop() ?? file;
      }
      return file;
    })
    .map((file) => file.replace(/^"|"$/g, ""))
    .filter(Boolean);
}

function syncGit(agentName: string) {
  console.log("🔄 Syncing git state...");
  const changedFiles = parseChangedFiles();

  if (changedFiles.length === 0) {
    console.log("✅ Git is clean.");
    return;
  }

  const claims = getAgentClaims(agentName);
  const unownedFiles: string[] = [];

  for (const file of changedFiles) {
    if (file.startsWith(".agents/")) continue;

    let isClaimed = claims.exact.has(file);
    if (!isClaimed) {
      isClaimed = claims.globs.some((glob) => matchGlob(file, glob));
    }

    if (!isClaimed) {
      unownedFiles.push(file);
    }
  }

  if (unownedFiles.length > 0) {
    console.error(`\n❌ SECURITY: Agent '${agentName}' modified files it does not own!`);
    unownedFiles.forEach((file) => console.error(`   - ${file}`));
    console.error("\nPlease revert these files or add them to your claimed files list first.");
    process.exit(1);
  }

  console.log(`✅ All ${changedFiles.length} changed files belong to '${agentName}'.`);

  for (const file of changedFiles) {
    runCommand(`git add -A -- "${file}"`);
  }

  runCommand(`git commit -m "chore(${agentName}): auto-checkpoint before sync"`);
  console.log("✅ Changes safely committed.");
}

function processHandoffs() {
  console.log("📬 Processing handoffs...");
  if (!fs.existsSync(HANDOFFS_DIR)) return;
  if (!fs.existsSync(INBOX_DIR)) {
    fs.mkdirSync(INBOX_DIR, { recursive: true });
  }

  const handoffs = fs
    .readdirSync(HANDOFFS_DIR)
    .filter((file) => file.endsWith(".json") && !file.startsWith("template"));

  if (handoffs.length === 0) {
    console.log("   No new handoffs.");
    return;
  }

  for (const file of handoffs) {
    const handoffPath = path.join(HANDOFFS_DIR, file);
    const content = JSON.parse(fs.readFileSync(handoffPath, "utf-8")) as {
      from?: string;
      to?: string;
      timestamp?: string;
      message?: string;
      changedFiles?: string[];
    };

    if (!content.to) continue;

    const inboxPath = path.join(INBOX_DIR, `${content.to}_inbox.txt`);
    const message = `
[${content.timestamp}] From: ${content.from}
Message: ${content.message}
Changed Files: ${content.changedFiles?.join(", ") || "None"}
`;

    fs.appendFileSync(inboxPath, message);
    fs.renameSync(handoffPath, path.join(HANDOFFS_DIR, `processed_${file}`));
    console.log(`✅ Processed handoff from ${content.from} to ${content.to}.`);
  }
}

function main() {
  console.log("🤖 Career-OS Multi-Agent Coordinator 🤖\n");

  if (!fs.existsSync(AGENTS_DIR)) {
    console.error("❌ .agents directory not found.");
    process.exit(1);
  }

  const currentAgent = getCurrentAgent();
  console.log(`📍 Current Agent Context: ${currentAgent}`);

  checkClaims();
  syncGit(currentAgent);
  processHandoffs();

  console.log("\n🚀 Coordination complete. Ready for next turn.");
}

main();
