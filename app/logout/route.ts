import { NextResponse } from "next/server";
import { COOKIE_NAME, currentToken, deleteToken } from "@/lib/auth";

export async function POST(req: Request) {
  const token = await currentToken();
  if (token) deleteToken(token);
  
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const base = host ? `${proto}://${host}` : req.url;

  const res = NextResponse.redirect(new URL("/login-user", base), 303);
  res.cookies.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return res;
}
