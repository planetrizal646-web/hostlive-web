import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { flash } from "@/lib/flash";
import { LoginScreen } from "@/components/LoginScreen";

export const metadata: Metadata = { title: "Masuk admin" };

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await currentUser();
  if (user) redirect(user.role === "admin" ? "/dashboard" : "/host");
  return <LoginScreen role="admin" flash={flash(await searchParams)} />;
}
