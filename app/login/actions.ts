"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";

export async function requestMagicLink(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email) redirect("/login");

  try {
    await signIn("resend", { email, redirectTo: "/portal" });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login/check-email");
    }
    throw error;
  }
}
