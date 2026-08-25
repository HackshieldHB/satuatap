import { NextRequest, NextResponse } from "next/server";

const EDGE_URL = process.env.EDGE_URL ?? "http://127.0.0.1:3100";
const EDGE_LOCAL_TOKEN = process.env.EDGE_LOCAL_TOKEN ?? "local-edge-token";

async function proxy(req: NextRequest, path: string[]) {
  const suffix = path.join("/");
  const search = new URL(req.url).search;
  const url = `${EDGE_URL}/${suffix}${search}`;
  const headers = new Headers();
  headers.set("x-edge-token", EDGE_LOCAL_TOKEN);
  const contentType = req.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  const body = req.method === "GET" || req.method === "HEAD" ? undefined : await req.text();
  const res = await fetch(url, { method: req.method, headers, body, cache: "no-store" });
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
  });
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> }
) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> }
) {
  const { path } = await ctx.params;
  return proxy(req, path);
}
