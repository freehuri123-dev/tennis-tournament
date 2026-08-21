import { readFileSync } from "node:fs";
import { signAdminSessionValue, verifyAdminSessionValue } from "./admin-session";

describe("admin session signing", () => {
  it("clears the Play Tennis admin cookie on logout", () => {
    const source = readFileSync("lib/server/auth/admin-session.ts", "utf8");

    expect(source).toContain('cookieStore.delete(getAdminSessionCookieName("pt"));');
  });
  it("verifies a signed session with the same secret", () => {
    const value = signAdminSessionValue("same-secret");

    expect(verifyAdminSessionValue(value, "same-secret")).toBe(true);
  });

  it("rejects a signed session with a different secret", () => {
    const value = signAdminSessionValue("same-secret");

    expect(verifyAdminSessionValue(value, "different-secret")).toBe(false);
  });

  it("rejects malformed and missing values", () => {
    expect(verifyAdminSessionValue(undefined, "same-secret")).toBe(false);
    expect(verifyAdminSessionValue("", "same-secret")).toBe(false);
    expect(verifyAdminSessionValue("not-a-session", "same-secret")).toBe(false);
    expect(verifyAdminSessionValue("1234.bad-signature.extra", "same-secret")).toBe(false);
  });

  it("does not sign a session without a configured secret", () => {
    expect(() => signAdminSessionValue("")).toThrow("SESSION_SECRET");
  });
});
