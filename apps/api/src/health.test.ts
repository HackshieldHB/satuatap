import { describe, expect, it } from "vitest";
import { buildApp } from "./app.js";

describe("health", () => {
  it("returns api up", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { services: { api: string } };
    expect(body.services.api).toBe("up");
    await app.close();
  });

  it("rejects unauthenticated home list", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/v1/homes" });
    expect(res.statusCode).toBe(401);
    await app.close();
  });
});
