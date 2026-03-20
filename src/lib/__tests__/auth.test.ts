// @vitest-environment node
import { test, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));

import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import { createSession, getSession } from "@/lib/auth";

const mockCookies = cookies as unknown as ReturnType<typeof vi.fn>;
const SECRET = new TextEncoder().encode("development-secret-key");

function makeCookieStore() {
  return { set: vi.fn(), get: vi.fn(), delete: vi.fn() };
}

beforeEach(() => {
  vi.resetAllMocks();
});

test("createSession sets an httpOnly cookie named auth-token", async () => {
  const store = makeCookieStore();
  mockCookies.mockResolvedValue(store);

  await createSession("user-1", "user@example.com");

  expect(store.set).toHaveBeenCalledOnce();
  const [name, , options] = store.set.mock.calls[0];
  expect(name).toBe("auth-token");
  expect(options.httpOnly).toBe(true);
  expect(options.path).toBe("/");
  expect(options.sameSite).toBe("lax");
});

test("createSession JWT contains userId and email", async () => {
  const store = makeCookieStore();
  mockCookies.mockResolvedValue(store);

  await createSession("user-1", "user@example.com");

  const [, token] = store.set.mock.calls[0];
  const { payload } = await jwtVerify(token, SECRET);
  expect(payload.userId).toBe("user-1");
  expect(payload.email).toBe("user@example.com");
});

test("createSession JWT expires in ~7 days", async () => {
  const store = makeCookieStore();
  mockCookies.mockResolvedValue(store);

  const before = Date.now();
  await createSession("user-1", "user@example.com");
  const after = Date.now();

  const [, token] = store.set.mock.calls[0];
  const { payload } = await jwtVerify(token, SECRET);
  const exp = (payload.exp as number) * 1000;
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  expect(exp).toBeGreaterThanOrEqual(before + sevenDays - 1000);
  expect(exp).toBeLessThanOrEqual(after + sevenDays + 1000);
});

async function makeToken(
  payload: Record<string, unknown>,
  expiresIn = "7d"
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresIn)
    .setIssuedAt()
    .sign(SECRET);
}

test("createSession cookie expires at the same time as the JWT", async () => {
  const store = makeCookieStore();
  mockCookies.mockResolvedValue(store);

  await createSession("user-1", "user@example.com");

  const [, token, options] = store.set.mock.calls[0];
  const { payload } = await jwtVerify(token, SECRET);
  const jwtExp = (payload.exp as number) * 1000;
  const cookieExp: Date = options.expires;

  expect(Math.abs(cookieExp.getTime() - jwtExp)).toBeLessThan(2000);
});

// ─── getSession ───────────────────────────────────────────────────────────────

test("getSession returns null when no cookie is present", async () => {
  const store = makeCookieStore();
  store.get.mockReturnValue(undefined);
  mockCookies.mockResolvedValue(store);

  expect(await getSession()).toBeNull();
});

test("getSession returns session payload for a valid token", async () => {
  const token = await makeToken({ userId: "user-1", email: "user@example.com" });
  const store = makeCookieStore();
  store.get.mockReturnValue({ value: token });
  mockCookies.mockResolvedValue(store);

  const session = await getSession();
  expect(session?.userId).toBe("user-1");
  expect(session?.email).toBe("user@example.com");
});

test("getSession returns null for an expired token", async () => {
  const token = await makeToken({ userId: "user-1", email: "user@example.com" }, "0s");
  const store = makeCookieStore();
  store.get.mockReturnValue({ value: token });
  mockCookies.mockResolvedValue(store);

  expect(await getSession()).toBeNull();
});

test("getSession returns null for a malformed token", async () => {
  const store = makeCookieStore();
  store.get.mockReturnValue({ value: "not.a.jwt" });
  mockCookies.mockResolvedValue(store);

  expect(await getSession()).toBeNull();
});

test("getSession returns null for a token signed with a different secret", async () => {
  const wrongSecret = new TextEncoder().encode("wrong-secret");
  const token = await new SignJWT({ userId: "user-1", email: "user@example.com" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(wrongSecret);
  const store = makeCookieStore();
  store.get.mockReturnValue({ value: token });
  mockCookies.mockResolvedValue(store);

  expect(await getSession()).toBeNull();
});
