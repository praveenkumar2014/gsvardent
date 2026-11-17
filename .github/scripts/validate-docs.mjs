import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

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
  "PROJECT/design/design-system.md",
  "PROJECT/product/user-stories.md",
  "PROJECT/development/coding-standards.md",
  "PROJECT/testing/testing-strategy.md",
  "PROJECT/deployment/ci-cd.md",
  "PROJECT/reports/release-readiness.md",
  "package.json",
  "tsconfig.json",
  "src/app/layout.tsx",
  "src/app/page.tsx",
  "src/app/login/page.tsx",
  "src/app/login/login-form.tsx",
  "src/app/workspace/page.tsx",
  "src/app/workspace/projects/page.tsx",
  "src/app/workspace/projects/projects-panel.tsx",
  "src/app/workspace/managers/page.tsx",
  "src/app/workspace/managers/manager-panel.tsx",
  "src/app/workspace/hivemind/page.tsx",
  "src/app/workspace/hivemind/team-board.tsx",
  "src/app/workspace/admin/page.tsx",
  "src/app/workspace/admin/admin-console.tsx",
  "src/app/workspace/skills/page.tsx",
  "src/app/api/workspaces/route.ts",
  "src/app/api/projects/route.ts",
  "src/app/api/projects/[projectId]/route.ts",
  "src/app/api/tasks/route.ts",
  "src/app/api/tasks/[taskId]/route.ts",
  "src/app/api/manager/decompose/route.ts",
  "src/app/api/manager/plans/route.ts",
  "src/app/api/agents/route.ts",
  "src/app/api/admin/members/route.ts",
  "src/app/api/admin/audit/route.ts",
  "src/lib/server/workspace.ts",
  "src/lib/supabase/server.ts",
  "src/lib/supabase/proxy.ts",
  "proxy.ts",
  "src/app/auth/callback/route.ts",
  ".env.example",
  "supabase/migrations/0001_initial_schema.sql",
  "supabase/migrations/0002_core_modules.sql"
];

const sections = [
  "instructions", "product", "design", "architecture", "development",
  "agents", "skills", "testing", "deployment", "reports"
];

const errors = [];
const markdownFiles = [];

function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (entry.isFile() && path.endsWith(".md")) markdownFiles.push(path);
  }
}

try {
  walk("PROJECT");
} catch {
  errors.push("PROJECT documentation directory is missing.");
}

if (markdownFiles.length < 50) {
  errors.push(`Expected at least 50 Markdown documents; found ${markdownFiles.length}.`);
}

for (const path of required) {
  try {
    if (!statSync(path).isFile() || readFileSync(path, "utf8").trim().length < 30) {
      errors.push(`Missing or unexpectedly short required file: ${path}`);
    }
  } catch {
    errors.push(`Missing required file: ${path}`);
  }
}

for (const section of sections) {
  try {
    if (!statSync(join("PROJECT", section)).isDirectory()) {
      errors.push(`Missing required PROJECT section: ${section}`);
    }
  } catch {
    errors.push(`Missing required PROJECT section: ${section}`);
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

console.log(`Validated ${markdownFiles.length} planning documents and required application files.`);
