import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolInvocationBadge } from "../ToolInvocationBadge";
import type { ToolInvocation } from "ai";

afterEach(() => {
  cleanup();
});

function makeInvocation(
  toolName: string,
  args: Record<string, unknown>,
  state: "call" | "result" = "result"
): ToolInvocation {
  return state === "result"
    ? { toolCallId: "id", toolName, args, state, result: "ok" }
    : { toolCallId: "id", toolName, args, state };
}

test("str_replace_editor create → 'Creating Card.tsx'", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation("str_replace_editor", {
        command: "create",
        path: "src/components/Card.tsx",
      })}
    />
  );
  expect(screen.getByText("Creating Card.tsx")).toBeDefined();
});

test("str_replace_editor str_replace → 'Editing index.tsx'", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation("str_replace_editor", {
        command: "str_replace",
        path: "src/index.tsx",
      })}
    />
  );
  expect(screen.getByText("Editing index.tsx")).toBeDefined();
});

test("str_replace_editor insert → 'Editing index.tsx'", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation("str_replace_editor", {
        command: "insert",
        path: "src/index.tsx",
      })}
    />
  );
  expect(screen.getByText("Editing index.tsx")).toBeDefined();
});

test("str_replace_editor view → 'Reading index.tsx'", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation("str_replace_editor", {
        command: "view",
        path: "src/index.tsx",
      })}
    />
  );
  expect(screen.getByText("Reading index.tsx")).toBeDefined();
});

test("file_manager rename → 'Renaming OldName.tsx'", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation("file_manager", {
        command: "rename",
        path: "src/OldName.tsx",
      })}
    />
  );
  expect(screen.getByText("Renaming OldName.tsx")).toBeDefined();
});

test("file_manager delete → 'Deleting Button.tsx'", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation("file_manager", {
        command: "delete",
        path: "src/Button.tsx",
      })}
    />
  );
  expect(screen.getByText("Deleting Button.tsx")).toBeDefined();
});

test("pending state renders spinner, no green dot", () => {
  const { container } = render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation(
        "str_replace_editor",
        { command: "create", path: "src/Card.tsx" },
        "call"
      )}
    />
  );
  expect(container.querySelector(".animate-spin")).toBeDefined();
  expect(container.querySelector(".bg-emerald-500")).toBeNull();
});

test("completed state renders green dot, no spinner", () => {
  const { container } = render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation(
        "str_replace_editor",
        { command: "create", path: "src/Card.tsx" },
        "result"
      )}
    />
  );
  expect(container.querySelector(".bg-emerald-500")).toBeDefined();
  expect(container.querySelector(".animate-spin")).toBeNull();
});

test("unknown tool with no args falls back to tool name", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation("my_custom_tool", {})}
    />
  );
  expect(screen.getByText("my_custom_tool")).toBeDefined();
});
