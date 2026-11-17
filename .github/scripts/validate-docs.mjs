import { readFileSync, statSync } from "node:fs";

const required = [
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
  "PROJECT/design/screen-inventory.md",
  "PROJECT/testing/testing-strategy.md",
  "PROJECT/deployment/ci-cd.md",
  "PROJECT/reports/release-readiness.md"
];

const errors = [];
for (const path of required) {
  try {
    if (!statSync(path).isFile() || readFileSync(path, "utf8").trim().length < 100) {
      errors.push(`Missing or unexpectedly short required document: ${path}`);
    }
  } catch {
    errors.push(`Missing required document: ${path}`);
  }
}
if (errors.length) {
  for (const error of errors) console.error(`::error::${error}`);
  process.exit(1);
}
console.log(`Validated ${required.length} required Verdent planning documents.`);
