import { NextResponse } from "next/server";

type FlashKey = "msg" | "err";

function getBase(req: Request) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  return host ? `${proto}://${host}` : req.url;
}

/** Redirect 303 ke path relatif dengan pesan flash di query string */
export function back(req: Request, path: string, key: FlashKey, text: string): NextResponse {
  const url = new URL(path, getBase(req));
  url.searchParams.set(key, text);
  return NextResponse.redirect(url, 303);
}

/** Redirect 303 tanpa pesan */
export function go(req: Request, path: string): NextResponse {
  return NextResponse.redirect(new URL(path, getBase(req)), 303);
}
