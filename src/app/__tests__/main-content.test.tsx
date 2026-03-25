import { test, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { fireEvent } from "@testing-library/dom";
import { MainContent } from "../main-content";

vi.mock("@/lib/contexts/file-system-context", () => ({
  FileSystemProvider: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/lib/contexts/chat-context", () => ({
  ChatProvider: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/components/chat/ChatInterface", () => ({
  ChatInterface: () => <div data-testid="chat-interface" />,
}));

vi.mock("@/components/editor/FileTree", () => ({
  FileTree: () => <div data-testid="file-tree" />,
}));

vi.mock("@/components/editor/CodeEditor", () => ({
  CodeEditor: () => <div data-testid="code-editor" />,
}));

vi.mock("@/components/preview/PreviewFrame", () => ({
  PreviewFrame: () => <div data-testid="preview-frame" />,
}));

vi.mock("@/components/HeaderActions", () => ({
  HeaderActions: () => <div data-testid="header-actions" />,
}));

vi.mock("@/components/ui/resizable", () => ({
  ResizablePanelGroup: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  ResizablePanel: ({ children }: any) => <div>{children}</div>,
  ResizableHandle: () => <div />,
}));

afterEach(() => {
  cleanup();
});

test("renders Preview tab active by default", () => {
  render(<MainContent />);
  expect(screen.getByTestId("preview-frame")).toBeDefined();
  expect(screen.queryByTestId("code-editor")).toBeNull();
});

test("clicking Code button switches to code view", () => {
  render(<MainContent />);

  const codeButton = screen.getByRole("button", { name: "Code" });
  fireEvent.mouseDown(codeButton);

  expect(screen.queryByTestId("preview-frame")).toBeNull();
  expect(screen.getByTestId("code-editor")).toBeDefined();
});

test("clicking Preview button switches back to preview view", () => {
  render(<MainContent />);

  // Switch to code
  const codeButton = screen.getByRole("button", { name: "Code" });
  fireEvent.mouseDown(codeButton);
  expect(screen.getByTestId("code-editor")).toBeDefined();

  // Switch back to preview
  const previewButton = screen.getByRole("button", { name: "Preview" });
  fireEvent.mouseDown(previewButton);
  expect(screen.getByTestId("preview-frame")).toBeDefined();
  expect(screen.queryByTestId("code-editor")).toBeNull();
});

test("toggle buttons use onMouseDown (fires before focus handoff)", () => {
  render(<MainContent />);

  const previewButton = screen.getByRole("button", { name: "Preview" });
  const codeButton = screen.getByRole("button", { name: "Code" });

  // Verify buttons exist and are plain <button> elements (not Radix Tabs)
  expect(previewButton.tagName).toBe("BUTTON");
  expect(codeButton.tagName).toBe("BUTTON");

  // mousedown should trigger the view change (not click)
  fireEvent.mouseDown(codeButton);
  expect(screen.getByTestId("code-editor")).toBeDefined();

  // a plain click should NOT change the view (no onClick handler)
  fireEvent.click(previewButton);
  // still on code view since we only have onMouseDown
  expect(screen.getByTestId("code-editor")).toBeDefined();
});
