"use client";

import { Loader2 } from "lucide-react";
import type { ToolInvocation } from "ai";

interface ToolInvocationBadgeProps {
  toolInvocation: ToolInvocation;
}

function getLabel(toolName: string, args: Record<string, unknown>): string {
  const basename = (p: unknown) =>
    typeof p === "string" && p ? p.split("/").pop() ?? p : null;

  const path = basename(args.path);

  if (toolName === "str_replace_editor") {
    const cmd = args.command;
    if (cmd === "create") return path ? `Creating ${path}` : toolName;
    if (cmd === "str_replace" || cmd === "insert")
      return path ? `Editing ${path}` : toolName;
    if (cmd === "view") return path ? `Reading ${path}` : toolName;
    if (cmd === "undo_edit") return path ? `Undoing edit to ${path}` : toolName;
  }

  if (toolName === "file_manager") {
    const cmd = args.command;
    if (cmd === "rename") return path ? `Renaming ${path}` : toolName;
    if (cmd === "delete") return path ? `Deleting ${path}` : toolName;
  }

  return toolName;
}

export function ToolInvocationBadge({ toolInvocation }: ToolInvocationBadgeProps) {
  const label = getLabel(toolInvocation.toolName, toolInvocation.args ?? {});
  const isDone =
    toolInvocation.state === "result" &&
    (toolInvocation as { result?: unknown }).result !== undefined;

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isDone ? (
        <>
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-neutral-700">{label}</span>
        </>
      ) : (
        <>
          <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
          <span className="text-neutral-700">{label}</span>
        </>
      )}
    </div>
  );
}
