import { renderHook, act } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: vi.fn() }));
vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));
vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));
vi.mock("@/actions/get-projects", () => ({ getProjects: vi.fn() }));
vi.mock("@/actions/create-project", () => ({ createProject: vi.fn() }));

import { useRouter } from "next/navigation";
import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";
import { useAuth } from "@/hooks/use-auth";

const mockPush = vi.fn();

beforeEach(() => {
  vi.resetAllMocks();
  (useRouter as ReturnType<typeof vi.fn>).mockReturnValue({ push: mockPush });
});

// ─── signIn ───────────────────────────────────────────────────────────────────

describe("signIn", () => {
  test("returns the result from the signIn action", async () => {
    (signInAction as ReturnType<typeof vi.fn>).mockResolvedValue({ success: false, error: "Invalid credentials" });
    (getAnonWorkData as ReturnType<typeof vi.fn>).mockReturnValue(null);

    const { result } = renderHook(() => useAuth());
    let returnValue: unknown;
    await act(async () => {
      returnValue = await result.current.signIn("a@b.com", "wrong");
    });

    expect(returnValue).toEqual({ success: false, error: "Invalid credentials" });
  });

  test("sets isLoading to true during the call and false after", async () => {
    let resolveSignIn!: (v: unknown) => void;
    (signInAction as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise((res) => { resolveSignIn = res; })
    );

    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoading).toBe(false);

    let signInPromise: Promise<unknown>;
    act(() => { signInPromise = result.current.signIn("a@b.com", "pw"); });
    expect(result.current.isLoading).toBe(true);

    await act(async () => { resolveSignIn({ success: false }); await signInPromise; });
    expect(result.current.isLoading).toBe(false);
  });

  test("resets isLoading to false even when the action throws", async () => {
    (signInAction as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("network"));

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("a@b.com", "pw").catch(() => {});
    });

    expect(result.current.isLoading).toBe(false);
  });

  test("does not navigate when sign-in fails", async () => {
    (signInAction as ReturnType<typeof vi.fn>).mockResolvedValue({ success: false });

    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signIn("a@b.com", "wrong"); });

    expect(mockPush).not.toHaveBeenCalled();
  });

  test("redirects to anon project and clears storage when anon work exists", async () => {
    (signInAction as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
    (getAnonWorkData as ReturnType<typeof vi.fn>).mockReturnValue({
      messages: [{ role: "user", content: "hello" }],
      fileSystemData: { "/": null },
    });
    (createProject as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "proj-anon" });

    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signIn("a@b.com", "pw"); });

    expect(createProject).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [{ role: "user", content: "hello" }],
        data: { "/": null },
      })
    );
    expect(clearAnonWork).toHaveBeenCalledOnce();
    expect(mockPush).toHaveBeenCalledWith("/proj-anon");
    expect(getProjects).not.toHaveBeenCalled();
  });

  test("skips anon work when messages array is empty", async () => {
    (signInAction as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
    (getAnonWorkData as ReturnType<typeof vi.fn>).mockReturnValue({
      messages: [],
      fileSystemData: {},
    });
    (getProjects as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: "proj-1" }]);

    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signIn("a@b.com", "pw"); });

    expect(createProject).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/proj-1");
  });

  test("redirects to most recent project when no anon work", async () => {
    (signInAction as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
    (getAnonWorkData as ReturnType<typeof vi.fn>).mockReturnValue(null);
    (getProjects as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "proj-recent" },
      { id: "proj-old" },
    ]);

    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signIn("a@b.com", "pw"); });

    expect(mockPush).toHaveBeenCalledWith("/proj-recent");
    expect(createProject).not.toHaveBeenCalled();
  });

  test("creates a new project when user has no existing projects", async () => {
    (signInAction as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
    (getAnonWorkData as ReturnType<typeof vi.fn>).mockReturnValue(null);
    (getProjects as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (createProject as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "proj-new" });

    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signIn("a@b.com", "pw"); });

    expect(createProject).toHaveBeenCalledWith(
      expect.objectContaining({ messages: [], data: {} })
    );
    expect(mockPush).toHaveBeenCalledWith("/proj-new");
  });
});

// ─── signUp ───────────────────────────────────────────────────────────────────

describe("signUp", () => {
  test("returns the result from the signUp action", async () => {
    (signUpAction as ReturnType<typeof vi.fn>).mockResolvedValue({ success: false, error: "Email taken" });
    (getAnonWorkData as ReturnType<typeof vi.fn>).mockReturnValue(null);

    const { result } = renderHook(() => useAuth());
    let returnValue: unknown;
    await act(async () => {
      returnValue = await result.current.signUp("a@b.com", "pw");
    });

    expect(returnValue).toEqual({ success: false, error: "Email taken" });
  });

  test("sets and resets isLoading around the call", async () => {
    let resolveSignUp!: (v: unknown) => void;
    (signUpAction as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise((res) => { resolveSignUp = res; })
    );

    const { result } = renderHook(() => useAuth());
    let signUpPromise: Promise<unknown>;
    act(() => { signUpPromise = result.current.signUp("a@b.com", "pw"); });
    expect(result.current.isLoading).toBe(true);

    await act(async () => { resolveSignUp({ success: false }); await signUpPromise; });
    expect(result.current.isLoading).toBe(false);
  });

  test("resets isLoading to false even when the action throws", async () => {
    (signUpAction as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("network"));

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signUp("a@b.com", "pw").catch(() => {});
    });

    expect(result.current.isLoading).toBe(false);
  });

  test("does not navigate when sign-up fails", async () => {
    (signUpAction as ReturnType<typeof vi.fn>).mockResolvedValue({ success: false });

    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signUp("a@b.com", "pw"); });

    expect(mockPush).not.toHaveBeenCalled();
  });

  test("follows the same post-sign-in flow on success", async () => {
    (signUpAction as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
    (getAnonWorkData as ReturnType<typeof vi.fn>).mockReturnValue(null);
    (getProjects as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: "proj-1" }]);

    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signUp("new@b.com", "pw"); });

    expect(mockPush).toHaveBeenCalledWith("/proj-1");
  });
});
