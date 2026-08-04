"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { isInvitedEmail } from "@/lib/starship-data";

export async function requestMagicLink(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email) redirect("/login?status=missing_email");
  if (!process.env.DATABASE_URL || !process.env.AUTH_RESEND_KEY || !process.env.STARSHIP_COACH_EMAILS) {
    redirect("/login?status=missing_config");
  }
  const invited = await isInvitedEmail(email);
  if (!invited) redirect("/login/check-email");

  try {
    await signIn("resend", { email, redirectTo: "/portal" });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login?status=auth_error");
    }
    throw error;
  }
}
