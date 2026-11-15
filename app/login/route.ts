import { NextResponse } from "next/server";
import { authenticate, COOKIE_NAME, createToken } from "@/lib/auth";
import { isRateLimited, isOriginValid } from "@/lib/security";

function getBase(req: Request) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  return host ? `${proto}://${host}` : req.url;
}

export async function POST(req: Request) {
  if (!isOriginValid(req)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  const base = getBase(req);

  if (isRateLimited(ip)) {
    const url = new URL("/login-user", base);
    url.searchParams.set("err", "Terlalu banyak percobaan. Coba lagi sebentar lagi.");
    return NextResponse.redirect(url, 303);
  }

  const form = await req.formData();
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  const from = String(form.get("from") ?? "/login-user");
  const target = from === "/login-admin" ? "/login-admin" : "/login-user";

  const user = authenticate(email, password);
  if (!user) {
    const url = new URL(target, base);
    url.searchParams.set("err", "Email atau password salah.");
    return NextResponse.redirect(url, 303);
  }

  const token = createToken(user.id);
  const dest = user.role === "admin" ? "/dashboard" : "/host";
  const res = NextResponse.redirect(new URL(dest, base), 303);
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * 24 * 3600,
  });
  return res;
}
