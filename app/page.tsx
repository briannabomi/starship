import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAuthDisabled } from "@/lib/demo-mode";

export default async function HomePage() {
  if (isAuthDisabled()) redirect("/demo");

  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role === "coach") redirect("/coach");
  redirect("/portal");
}
