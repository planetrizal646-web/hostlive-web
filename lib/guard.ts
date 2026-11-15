import { NextResponse } from "next/server";
import { currentUser, currentToken } from "./auth";
import type { User } from "./db";
import { back } from "./redirect";
import { isOriginValid } from "./security";

export type Guard = { user: User; token: string | undefined };

/** Guard area host di route handler; role salah = redirect, bukan JSON */
export async function hostGuard(req: Request, failPath: string): Promise<Guard | NextResponse> {
  if (!isOriginValid(req)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const user = await currentUser();
  if (!user) return back(req, "/login-user", "err", "Silakan masuk terlebih dahulu.");
  if (user.role !== "host") return back(req, failPath || "/dashboard", "err", "Akses ditolak.");
  return { user, token: await currentToken() };
}

export async function adminGuard(req: Request, failPath: string): Promise<Guard | NextResponse> {
  if (!isOriginValid(req)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const user = await currentUser();
  if (!user) return back(req, "/login-admin", "err", "Silakan masuk terlebih dahulu.");
  if (user.role !== "admin") return back(req, failPath || "/host", "err", "Akses ditolak.");
  return { user, token: await currentToken() };
}
