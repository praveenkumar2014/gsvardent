import { createClient } from "@/lib/supabase/server";
import { type PlanAction, type TaskAction, WorkflowError } from "./workflow";

/**
 * Shared server helpers for audited workflow mutations.
 *
 * An idempotency key is stored in the semantic audit row written by the
 * database function. Repeating the same request returns the already-applied
 * result instead of performing a second transition. (The check and the write
 * are separate statements; the audit uniqueness constraint on
 * (action, metadata->>'idempotency_key') in migration 0004 is the final guard.)
 */

export type WorkflowClient = Awaited<ReturnType<typeof createClient>>;

export function planAuditAction(action: PlanAction): string {
  return `manager.plan.${action}`;
}

export function taskAuditAction(action: TaskAction): string {
  return `tasks.${action}`;
}

export function auditMetadata(
  metadata: Record<string, unknown>,
  idempotencyKey?: string
): Record<string, unknown> {
  return idempotencyKey ? { ...metadata, idempotency_key: idempotencyKey } : metadata;
}

/** True when an identical keyed transition was already recorded for this workspace. */
export async function findIdempotentAudit(
  client: WorkflowClient,
  workspaceId: string,
  action: string,
  idempotencyKey?: string
): Promise<boolean> {
  if (!idempotencyKey) return false;
  const { data, error } = await client
    .from("audit_logs")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("action", action)
    .contains("metadata", { idempotency_key: idempotencyKey })
    .limit(1);

  // Fail closed: never risk applying a non-idempotent write when the audit
  // lookup itself could not be completed.
  if (error) {
    throw new WorkflowError("AUDIT_UNAVAILABLE", "Idempotency check could not be completed.");
  }
  return (data?.length ?? 0) > 0;
}

/** Human-readable message for a rejected database workflow function. */
export function rpcErrorMessage(error: { message?: string } | null | undefined, fallback: string): string {
  const message = error?.message?.trim();
  if (!message) return fallback;
  if (message.includes("PERMISSION_DENIED") || message.toLowerCase().includes("role")) {
    return "Your workspace role cannot perform this workflow action.";
  }
  return message;
}
