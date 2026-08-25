import { describe, expect, it } from "vitest";
import { buildApp } from "./app.js";

describe("API rate limiting", () => {
  it("returns 429 from /v1/auth/login after the per-IP limit is exceeded", async () => {
    const app = await buildApp();
    const payload = { email: "nobody@example.com", password: "wrong" };
    let last = { statusCode: 0, body: "" as string };
    for (let i = 0; i < 12; i++) {
      const res = await app.inject({
        method: "POST",
        url: "/v1/auth/login",
        payload,
        remoteAddress: "203.0.113.10",
      });
      last = { statusCode: res.statusCode, body: res.body };
    }
    expect(last.statusCode).toBe(429);
    const json = JSON.parse(last.body) as { success: boolean; error: string };
    expect(json.success).toBe(false);
    expect(json.error).toBeTruthy();
    await app.close();
  });
});
