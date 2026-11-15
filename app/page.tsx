import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// §5.1: akar mengarahkan sesuai role / status login
export default async function Page() {
  const user = await currentUser();
  if (!user) redirect("/login-user");
  redirect(user.role === "admin" ? "/dashboard" : "/host");
}
