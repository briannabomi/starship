import NextAuth from "next-auth";
import Nodemailer from "next-auth/providers/nodemailer";
import PostgresAdapter from "@auth/pg-adapter";
import { pool } from "./lib/db";
import { ensureProfileForEmail, getSessionProfileByUserId, isInvitedEmail } from "./lib/starship-data";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PostgresAdapter(pool),
  session: { strategy: "database" },
  pages: {
    signIn: "/login",
    verifyRequest: "/login/check-email",
    error: "/login",
  },
  providers: [
    Nodemailer({
      server: process.env.AUTH_EMAIL_SERVER || "smtp://localhost:1025",
      from: process.env.AUTH_EMAIL_FROM || "Starship <login@example.test>",
      maxAge: 15 * 60,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const address = user.email;
      if (!address) return false;
      return isInvitedEmail(address);
    },
    async session({ session, user }) {
      if (user.email) await ensureProfileForEmail(user.id, user.email, user.name || null);
      const profile = await getSessionProfileByUserId(user.id);
      session.user.id = user.id;
      session.user.role = profile?.role || "client";
      session.user.clientId = profile?.clientId || null;
      session.user.clientStatus = profile?.clientStatus || null;
      return session;
    },
  },
});
