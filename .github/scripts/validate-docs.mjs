import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const requiredFiles = [
  "PROJECT/MASTER.md",
  "PROJECT/PRD.md",
  "PROJECT/REQUIREMENTS.md",
  "PROJECT/ROADMAP.md",
  "PROJECT/TASKS.md",
  "PROJECT/PROGRESS.md",
  "PROJECT/instructions/agents.md",
  "PROJECT/architecture/architecture.md",
  "PROJECT/architecture/database.md",
  "PROJECT/architecture/rbac.md",
  "PROJECT/architecture/security.md",
  "PROJECT/design/design-system.md",
  "PROJECT/product/user-stories.md",
  "PROJECT/development/coding-standards.md",
  "PROJECT/testing/testing-strategy.md",
  "PROJECT/deployment/ci-cd.md",
  "PROJECT/reports/release-readiness.md"
];

const requiredSections = [
  "instructions", "product", "design", "architecture", "development",
  "agents", "skills", "testing", "deployment", "reports"
];

const markdownFiles = [];
function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (entry.isFile() && path.endsWith(".md")) markdownFiles.push(path);
  }
}

const errors = [];
try {
  walk("PROJECT");
} catch {
  errors.push("PROJECT documentation directory is missing.");
}

if (markdownFiles.length < 70) {
  errors.push(`Expected at least 70 project Markdown documents; found ${markdownFiles.length}.`);
}

for (const path of requiredFiles) {
  try {
    if (!statSync(path).isFile() || readFileSync(path, "utf8").trim().length < 100) {
      errors.push(`Missing or unexpectedly short required document: ${path}`);
    }
  } catch {
    errors.push(`Missing required document: ${path}`);
  }
}

for (const section of requiredSections) {
  try {
    if (!statSync(join("PROJECT", section)).isDirectory()) {
      errors.push(`Missing required documentation section: PROJECT/${section}`);
    }
  } catch {
    errors.push(`Missing required documentation section: PROJECT/${section}`);
  }
}

const rbac = readFileSync("PROJECT/architecture/rbac.md", "utf8").toLowerCase();
for (const role of ["superuser", "admin", "staff", "investor", "user"]) {
  if (!rbac.includes(role)) errors.push(`RBAC specification is missing role: ${role}`);
}

if (errors.length) {
  for (const error of errors) console.error(`::error::${error}`);
  process.exit(1);
}
console.log(`Validated ${markdownFiles.length} Verdent Markdown documents across ${requiredSections.length} sections.`);
